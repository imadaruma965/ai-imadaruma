const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const { Agent, CursorAgentError, AuthenticationError } = require("@cursor/sdk");
const { loadLocalEnv, hasCursorApiKey, getCursorApiKey } = require("./lib/load-local-env.cjs");
const gcal = require("./gcal.cjs");
const knowledgeSearch = require("./lib/knowledge-search.cjs");
const smartRabbitContext = require("./lib/smart-rabbit-context.cjs");

// cwd や起動シェルに依存せず、apps/taskboard/.env.local を読む（既存envは上書きしない）
loadLocalEnv();

const APP_DIR = __dirname;
const REPO_ROOT = path.resolve(APP_DIR, "../..");
const DATA_DIR = path.join(APP_DIR, "data");
const SESSION_FILE = path.join(DATA_DIR, ".sontoku-sessions.json");
const SMART_RABBIT_SESSION_FILE = path.join(DATA_DIR, ".smartrabbit-sessions.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const CHAT_LOG_DIR = path.join(REPO_ROOT, "daily_governance", "chat_logs");
const PORT = Number(process.env.GYOMU_TOCHI_PORT || 8765);
const HOST = process.env.GYOMU_TOCHI_HOST || "0.0.0.0";
const MODEL = process.env.SONTOKU_MODEL || "auto";
const MAX_BODY_BYTES = 1024 * 1024;
const SONTOKU_RATE_LIMIT_PER_MINUTE = 10;
const SONTOKU_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SMART_RABBIT_RATE_LIMIT_PER_MINUTE = 10;
const SMART_RABBIT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SMART_RABBIT_AGENT_TIMEOUT_MS = 55 * 1000;
const SMART_RABBIT_REQUEST_CACHE_TTL_MS = 10 * 60 * 1000;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const dateQueues = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isAuthorized(req) {
  const token = process.env.TASKBOARD_TOKEN || "";
  if (!token) return true;
  return req.headers["x-taskboard-token"] === token;
}

const sontokuCallLog = new Map();

function checkSontokuRateLimit(date, now = Date.now()) {
  const windowStart = now - SONTOKU_RATE_LIMIT_WINDOW_MS;
  const recent = (sontokuCallLog.get(date) || []).filter((t) => t > windowStart);
  if (recent.length >= SONTOKU_RATE_LIMIT_PER_MINUTE) {
    sontokuCallLog.set(date, recent);
    return false;
  }
  recent.push(now);
  sontokuCallLog.set(date, recent);
  return true;
}

const smartRabbitCallLog = new Map();

function checkSmartRabbitRateLimit(sessionKey, now = Date.now()) {
  const windowStart = now - SMART_RABBIT_RATE_LIMIT_WINDOW_MS;
  const recent = (smartRabbitCallLog.get(sessionKey) || []).filter((t) => t > windowStart);
  if (recent.length >= SMART_RABBIT_RATE_LIMIT_PER_MINUTE) {
    smartRabbitCallLog.set(sessionKey, recent);
    return false;
  }
  recent.push(now);
  smartRabbitCallLog.set(sessionKey, recent);
  return true;
}

// messageId単位の直近応答キャッシュ。二重送信(通信リトライ・多重クリック)で
// Cursor Agentを二重に呼ばず、会話ログも二重保存しないための最終防御。
const smartRabbitRequestCache = new Map();

function cacheSmartRabbitResult(messageId, result, now = Date.now()) {
  if (!messageId) return;
  smartRabbitRequestCache.set(messageId, { result, expiresAt: now + SMART_RABBIT_REQUEST_CACHE_TTL_MS });
}

function getCachedSmartRabbitResult(messageId, now = Date.now()) {
  if (!messageId) return null;
  const entry = smartRabbitRequestCache.get(messageId);
  if (!entry) return null;
  if (entry.expiresAt < now) {
    smartRabbitRequestCache.delete(messageId);
    return null;
  }
  return entry.result;
}

function contentHashOf(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function clip(value, max = 12000) {
  const text = String(value || "");
  return text.length > max ? text.slice(-max) : text;
}

async function readOptional(file, max) {
  try {
    return clip(await fsp.readFile(file, "utf8"), max);
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function readSessions() {
  try {
    const parsed = JSON.parse(await fsp.readFile(SESSION_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return {};
    throw error;
  }
}

async function writeSessions(sessions) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const temporary = `${SESSION_FILE}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, SESSION_FILE);
}

// スマートラビットのセッションストアは sessionId -> Cursor agentId の対応表のみを持つ。
// 会話本文はクライアント側 state.smartRabbitChat が正本(既存state.json同期の仕組みに乗せる)。
async function readSmartRabbitSessions() {
  try {
    const parsed = JSON.parse(await fsp.readFile(SMART_RABBIT_SESSION_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return {};
    throw error;
  }
}

async function writeSmartRabbitSessions(sessions) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const temporary = `${SMART_RABBIT_SESSION_FILE}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify(sessions, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, SMART_RABBIT_SESSION_FILE);
}

function sanitizeStateData(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    reviews: data.reviews && typeof data.reviews === "object" ? data.reviews : {},
    plans: data.plans && typeof data.plans === "object" ? data.plans : {},
    kpis: data.kpis && typeof data.kpis === "object" ? data.kpis : {},
    board: data.board && typeof data.board === "object" ? data.board : {},
    categories: Array.isArray(data.categories) ? data.categories : [],
    sontokuChat: data.sontokuChat && typeof data.sontokuChat === "object" ? data.sontokuChat : {},
    smartRabbitChat: data.smartRabbitChat && typeof data.smartRabbitChat === "object" ? data.smartRabbitChat : {},
    smartRabbitActiveSession:
      typeof data.smartRabbitActiveSession === "string" ? data.smartRabbitActiveSession : "",
    incidents: Array.isArray(data.incidents) ? data.incidents : [],
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    personalFinance:
      data.personalFinance && typeof data.personalFinance === "object"
        ? { entries: Array.isArray(data.personalFinance.entries) ? data.personalFinance.entries : [] }
        : { entries: [] },
    appointments: Array.isArray(data.appointments) ? data.appointments : [],
    liabilities: Array.isArray(data.liabilities) ? data.liabilities : [],
    salesPipeline: Array.isArray(data.salesPipeline) ? data.salesPipeline : [],
    fiscalMeta: sanitizeFiscalMeta(data.fiscalMeta),
    business: sanitizeBusiness(data.business),
  };
}

// Phase 2A-13: 将来の編集UIに備えた最小構造。今回はUIを作らないが、
// 値が入れば buildSmartRabbitContext がstrategy/*.mdより優先して使う。
function sanitizeBusiness(raw) {
  const business = raw && typeof raw === "object" ? raw : {};
  const instagram = business.instagram && typeof business.instagram === "object" ? business.instagram : {};
  return {
    instagram: {
      brandName: typeof instagram.brandName === "string" ? instagram.brandName : "",
      tagline: typeof instagram.tagline === "string" ? instagram.tagline : "",
      pillars: Array.isArray(instagram.pillars) ? instagram.pillars.filter((p) => typeof p === "string") : [],
      updatedAt: typeof instagram.updatedAt === "string" ? instagram.updatedAt : null,
    },
    services: Array.isArray(business.services) ? business.services : [],
    researchProjects: Array.isArray(business.researchProjects) ? business.researchProjects : [],
  };
}

function sanitizeFiscalMeta(raw) {
  const fm = raw && typeof raw === "object" ? raw : {};
  const num = (v) => (v == null || v === "" ? null : Number(v));
  return {
    defenseLine: num(fm.defenseLine),
    note: String(fm.note || ""),
    currentBalance: num(fm.currentBalance),
    confirmedInflow: num(fm.confirmedInflow),
    expectedInflow: num(fm.expectedInflow),
    fixedCosts: num(fm.fixedCosts),
    variableCosts: num(fm.variableCosts),
    scheduledPayments: num(fm.scheduledPayments),
  };
}

async function readStateRecord() {
  try {
    const parsed = JSON.parse(await fsp.readFile(STATE_FILE, "utf8"));
    if (parsed && parsed.data) {
      return {
        updatedAt: parsed.updatedAt || null,
        data: sanitizeStateData(parsed.data),
      };
    }
    return {
      updatedAt: null,
      data: sanitizeStateData(parsed),
    };
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) {
      return { updatedAt: null, data: null };
    }
    throw error;
  }
}

async function writeStateRecord(body) {
  const current = await readStateRecord();
  if (body.updatedAt && current.updatedAt && body.updatedAt !== current.updatedAt) {
    return { conflict: true, updatedAt: current.updatedAt, data: current.data };
  }
  const updatedAt = new Date().toISOString();
  const record = {
    updatedAt,
    data: sanitizeStateData(body.data),
  };
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const temporary = `${STATE_FILE}.tmp`;
  await fsp.writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await fsp.rename(temporary, STATE_FILE);
  return { conflict: false, updatedAt, data: record.data };
}

function getLanUrls() {
  const urls = [`http://127.0.0.1:${PORT}/`];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === "IPv4" && !net.internal) {
        urls.push(`http://${net.address}:${PORT}/`);
      }
    });
  });
  return [...new Set(urls)];
}

function getTailscaleUrl() {
  const candidates = ["tailscale", "/Applications/Tailscale.app/Contents/MacOS/Tailscale"];
  for (const bin of candidates) {
    try {
      const ip = execFileSync(bin, ["ip", "-4"], { encoding: "utf8", timeout: 2000 }).trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return `http://${ip}:${PORT}/`;
    } catch {
      /* try next */
    }
  }
  return null;
}

function getAccessUrls() {
  const lan = getLanUrls();
  const tailscale = getTailscaleUrl();
  const urls = tailscale ? [...lan, tailscale] : lan;
  const mobileUrl = lan.find((url) => /192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./.test(url)) || lan[1] || lan[0];
  return { urls, lanUrls: lan, tailscaleUrl: tailscale, mobileUrl };
}

function enqueueByDate(date, operation) {
  const previous = dateQueues.get(date) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  dateQueues.set(date, current);
  current.then(
    () => {
      if (dateQueues.get(date) === current) dateQueues.delete(date);
    },
    () => {
      if (dateQueues.get(date) === current) dateQueues.delete(date);
    }
  );
  return current;
}

function normalizeContext(raw) {
  const context = raw && typeof raw === "object" ? raw : {};
  const tasks = Array.isArray(context.tasks)
    ? context.tasks.slice(0, 30).map((task) => ({
        title: clip(task.title, 200),
        category: clip(task.category, 60),
        status: clip(task.status, 30),
        dueDate: clip(task.dueDate, 20),
        priority: clip(task.priority, 40),
        onToday: Boolean(task.onToday),
        forced: Boolean(task.forced),
      }))
    : [];
  return {
    localTime: clip(context.localTime, 60),
    goal: clip(context.goal, 500),
    ifthen: clip(context.ifthen, 500),
    energy: clip(context.energy, 30),
    habits: context.habits && typeof context.habits === "object" ? context.habits : {},
    kpis: context.kpis && typeof context.kpis === "object" ? context.kpis : {},
    completedToday: Number(context.completedToday || 0),
    pendingCount: Number(context.pendingCount || 0),
    tasks,
    schedule: context.schedule && typeof context.schedule === "object" ? context.schedule : {},
    appointments: Array.isArray(context.appointments)
      ? context.appointments.slice(0, 20).map((a) => ({
          title: clip(a.title, 200),
          startAt: clip(a.startAt, 40),
          endAt: clip(a.endAt, 40),
          conflict: Boolean(a.conflict),
        }))
      : [],
    domainAssessments: Array.isArray(context.domainAssessments)
      ? context.domainAssessments.slice(0, 5).map((dm) => ({
          id: clip(dm.id, 30),
          name: clip(dm.name, 30),
          status: clip(dm.status, 20),
          score: Number(dm.score) || 0,
          summary: clip(dm.summary, 200),
        }))
      : [],
    activeAlerts: Array.isArray(context.activeAlerts)
      ? context.activeAlerts.slice(0, 5).map((al) => ({
          type: clip(al.type, 60),
          severity: clip(al.severity, 20),
          title: clip(al.title, 100),
          message: clip(al.message, 300),
        }))
      : [],
  };
}

function computeTrackRecord(stateData, referenceDate) {
  const tasks = Array.isArray(stateData?.tasks) ? stateData.tasks : [];
  const windowStart = new Date(referenceDate);
  windowStart.setDate(windowStart.getDate() - 14);
  const z = (n) => String(n).padStart(2, "0");
  const windowStartISO = `${windowStart.getFullYear()}-${z(windowStart.getMonth() + 1)}-${z(windowStart.getDate())}`;
  const completedRecent = tasks.filter(
    (t) => t.status === "done" && String(t.updatedAt || "").slice(0, 10) >= windowStartISO
  ).length;
  const forcedOverdue = tasks.filter(
    (t) => t.forced && t.status !== "done" && t.dueDate && t.dueDate < referenceDate
  ).length;
  const forcedTotal = tasks.filter((t) => t.forced).length;
  return { completedRecent, forcedOverdue, forcedTotal, windowStartISO };
}

async function basePrompt(date) {
  const [persona, skill, recentLog, today, stateRecord] = await Promise.all([
    readOptional(path.join(REPO_ROOT, "cabinet", "sontoku.md"), 20000),
    readOptional(path.join(REPO_ROOT, ".claude", "skills", "sontoku", "SKILL.md"), 10000),
    readOptional(path.join(REPO_ROOT, "daily_governance", "sontoku_session_log.md"), 14000),
    readOptional(path.join(REPO_ROOT, "daily_governance", "today.md"), 10000),
    readStateRecord(),
  ]);
  const track = computeTrackRecord(stateRecord.data, date);

  return `あなたはキングダムOSのAI尊徳である。以下の正本と運用規則を採用し、今さんの実行マネージャーとして対話する。

重要な境界:
- 戦略を変更しない。戦略判断はAI栄一の領分である。
- この対話ではファイル編集、シェル実行、コミットなどのツール操作を行わない。
- キングダムOSから渡された最新の任務・進捗を事実として扱う。
- 予定・約束は Googleカレンダー連携の情報を事実として扱う。時間が重なる予定（バッティング）があれば、任務の話より先に短く警告する。
- 応答は日本語で簡潔にし、冒頭は必ず「尊徳:」とする。
- 定型文ではなく、今さんの発言と現在情報を踏まえて自然に応答する。
- 分からないことを推測で断定せず、実行に必要な問いを一つずつ返す。
- 本日は ${date}。

【直近14日間の実績（キングダムOSデータより・${track.windowStartISO}〜${date}）】
- 完了タスク数（この期間中に完了扱いになったもの）: ${track.completedRecent}件
- 強制タスク（発信・定期）の期限超過中: ${track.forcedOverdue}件 / 全${track.forcedTotal}件

介入強度の目安（管理から自治への移行）: 期限超過が0〜1件で、完了数が積み上がっている場合は、事実提示を簡潔にし、確認の問いも最小限にとどめてよい。期限超過が2件以上、または完了数が乏しい場合は、これまで通り強く事実を提示し、確認を行うこと。最終判断は、この数値と直近セッション記録の文脈を合わせて行う。

【人格正本 cabinet/sontoku.md】
${persona}

【運用規則 .claude/skills/sontoku/SKILL.md】
${skill}

【直近の尊徳セッション記録】
${recentLog}

【日次統治の現況】
${today}`;
}

function turnPrompt({ date, message, event, context, firstTurn }) {
  const request =
    event === "open"
      ? "今さんが今日の計画を開いた。時刻・任務・進捗に合わせ、挨拶と必要な確認を一つ伝える。"
      : `今さんの発言:\n${clip(message, 4000)}`;
  return `${firstTurn ? "ここからキングダムOSでの継続対話を開始する。\n\n" : ""}【現在時刻・キングダムOSの最新情報】
日付: ${date}
${JSON.stringify(context, null, 2)}

【今回の入力】
${request}

AI尊徳として、今さんに直接返答すること。`;
}

function normalizeSmartRabbitContext(raw) {
  const context = raw && typeof raw === "object" ? raw : {};
  const tasks = Array.isArray(context.tasks)
    ? context.tasks.slice(0, 15).map((task) => ({
        title: clip(task.title, 160),
        category: clip(task.category, 60),
        status: clip(task.status, 30),
        dueDate: clip(task.dueDate, 20),
      }))
    : [];
  return {
    localTime: clip(context.localTime, 60),
    goal: clip(context.goal, 500),
    tasks,
    activeAlerts: Array.isArray(context.activeAlerts)
      ? context.activeAlerts.slice(0, 5).map((a) => ({
          type: clip(a.type, 60),
          severity: clip(a.severity, 20),
          title: clip(a.title, 100),
          message: clip(a.message, 300),
        }))
      : [],
    salesSummary:
      context.salesSummary && typeof context.salesSummary === "object" ? context.salesSummary : null,
  };
}

function knowledgeBlock(knowledge) {
  if (!knowledge.available) {
    return `【Knowledge検索】\n利用不可(検索基盤に接続できませんでした: ${knowledge.error || "unknown"})。ローカル情報のみで回答すること。存在しないKnowledgeを参照したふりをしない。`;
  }
  if (!knowledge.query) {
    return "【Knowledge検索】\n検索語を抽出できなかったため未実施。";
  }
  if (!knowledge.results.length) {
    return `【Knowledge検索結果(クエリ: ${knowledge.query})】\n該当するKnowledgeなし。断定せず、不足している場合はその旨を伝える。`;
  }
  const lines = knowledge.results
    .map((r, i) => `${i + 1}. ${r.path}${r.heading ? ` — ${r.heading}` : ""}\n   ${clip(r.excerpt || "", 300)}`)
    .join("\n");
  return `【Knowledge検索結果(クエリ: ${knowledge.query})】\n${lines}\n\n回答では参照した項目のパスを「参照したKnowledge」として示すこと。ここにない情報を断定しないこと。`;
}

async function smartRabbitBasePrompt(date, mode) {
  const cfg = knowledgeSearch.MODE_CONFIG[knowledgeSearch.resolveMode(mode)];
  const [persona, skill, recentLog, today] = await Promise.all([
    readOptional(path.join(REPO_ROOT, "cabinet", "smart_rabbit.md"), 20000),
    readOptional(path.join(REPO_ROOT, ".claude", "skills", "smart_rabbit", "SKILL.md"), 12000),
    readOptional(path.join(REPO_ROOT, "daily_governance", "smart_rabbit_session_log.md"), 8000),
    readOptional(path.join(REPO_ROOT, "daily_governance", "today.md"), 8000),
  ]);

  return `あなたはキングダムOSのAIスマートラビット(内閣総理)である。以下の人格正本を採用し、今さんの戦略相談・発想・問題解決の相手として対話する。

重要な境界:
- これは日次実行チャット(AI尊徳)とは別の相談チャットである。進捗確認・日次タスク管理はAI尊徳の領分なので深入りしない。
- この対話ではファイル編集、シェル実行、コミットなどのツール操作を行わない。
- 単なる肯定・雑談はしない。目的の理解、情報整理、優先順位付け、実行可能な案への変換、必要な反論、過剰な開発・寄り道の制止を行う。
- 売上・実行・健康・時間の観点を常に持つ。最終判断は今さんに委ねる。
- 本日は ${date}。今回の相談モードは「${cfg.label}」。

【今回のモードで優先する観点】
${cfg.focus.length ? cfg.focus.join(" / ") : "特になし(総合相談)"}

【回答の型】
短い質問には短く答える。込み入った相談のときのみ、必要な項目だけ次の見出しを使ってよい(毎回すべて出す必要はない):
結論 / 現状認識 / 推奨判断 / 今日の第一任務 / 次の具体行動 / 参照したKnowledge / 未確定事項
参照したKnowledgeが無い場合は「参照Knowledgeなし」と明記する。存在しないKnowledgeを参照したふりをしない。

【業務コンテキストとKnowledgeの扱い】
プロンプト内の「業務コンテキスト」節はstate.json由来の事実(タスク・営業・財政・KPIなど)、「Knowledge検索結果」節はVault検索由来の知識である。両者を混同せず、回答の「参照したKnowledge」にはKnowledge節のパスのみを書く。業務コンテキストにない事実を作らない。「未登録」は0や「なし」と解釈しない。更新日時が古い可能性がある節は断定的に扱わない。情報が不足していても、質問を返すだけで終わらず、現時点で可能な判断は示す。

応答の冒頭は必ず「**スマートラビット**:」とする。

【人格正本 cabinet/smart_rabbit.md】
${persona}

【運用規則(検索方針など) .claude/skills/smart_rabbit/SKILL.md より抜粋採用】
${skill}

【直近のスマートラビット・セッション記録】
${recentLog || "(まだ記録なし)"}

【日次統治の現況 daily_governance/today.md】
${today || "(未記入)"}`;
}

function smartRabbitTurnPrompt({ date, mode, message, context, knowledge, businessContextText, firstTurn }) {
  const cfg = knowledgeSearch.MODE_CONFIG[knowledgeSearch.resolveMode(mode)];
  const localTime = context && context.localTime ? context.localTime : date;
  return `${firstTurn ? "ここからキングダムOSでのスマートラビット相談セッションを開始する。\n\n" : ""}【現在時刻】
${localTime} / 日付: ${date} / モード: ${cfg.label}

${businessContextText || "【業務コンテキスト】\n(利用不可)"}

${knowledgeBlock(knowledge)}

【今さんの相談】
${clip(message, 4000)}

スマートラビットとして、今さんに直接返答すること。`;
}

async function openSmartRabbitAgent(sessionId, existingId) {
  const options = {
    apiKey: getCursorApiKey(),
    model: { id: MODEL },
    name: `スマートラビット・キングダムOS ${sessionId}`,
    mode: "plan",
    local: {
      cwd: REPO_ROOT,
      settingSources: ["project"],
      sandboxOptions: { enabled: true },
    },
  };

  if (existingId) {
    try {
      return { agent: await Agent.resume(existingId, options), firstTurn: false };
    } catch (error) {
      if (error?.code !== "agent_not_found") throw error;
    }
  }
  return { agent: await Agent.create(options), firstTurn: true };
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error("smart_rabbit_timeout"), { code: "timeout" }));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function appendSmartRabbitChatLog({ date, sessionId, mode, message, response, agentId, runId }) {
  await fsp.mkdir(CHAT_LOG_DIR, { recursive: true });
  const file = path.join(CHAT_LOG_DIR, `smart-rabbit-${date}.md`);
  let exists = true;
  try {
    await fsp.access(file);
  } catch {
    exists = false;
  }
  const time = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const header = exists
    ? ""
    : `# AIスマートラビット・キングダムOS 相談ログ — ${date}\n\n> Cursor SDK agent: ${agentId}\n> キングダムOSから自動記録。原本会話であり正式Knowledgeではない(承認後に別途Knowledge化を検討)。\n\n`;
  const entry = `## ${time} [${mode}] (session: ${sessionId})\n\n**今さん**\n\n${markdownQuote(message)}\n\n**スマートラビット**\n\n${markdownQuote(response)}\n\n<!-- run: ${runId} -->\n\n`;
  await fsp.appendFile(file, `${header}${entry}`, "utf8");
}

async function runSmartRabbitTurn(payload) {
  const { date, sessionId } = payload;
  const mode = knowledgeSearch.resolveMode(payload.mode);
  const message = String(payload.message || "").trim();
  const context = normalizeSmartRabbitContext(payload.context);
  const knowledge = await knowledgeSearch.searchForMode(mode, message);
  const stateRecord = await readStateRecord();
  const businessContext = smartRabbitContext.buildSmartRabbitContext({
    mode,
    state: stateRecord.data || {},
    userMessage: message,
    knowledgeResults: knowledge,
    now: new Date(),
  });
  const businessContextText = smartRabbitContext.contextToPromptText(businessContext);
  const sessions = await readSmartRabbitSessions();
  const { agent, firstTurn } = await openSmartRabbitAgent(sessionId, sessions[sessionId]?.agentId);
  try {
    const prompt = `${firstTurn ? `${await smartRabbitBasePrompt(date, mode)}\n\n` : ""}${smartRabbitTurnPrompt({
      date,
      mode,
      message,
      context,
      knowledge,
      businessContextText,
      firstTurn,
    })}`;
    const run = await withTimeout(agent.send(prompt, { mode: "plan" }), SMART_RABBIT_AGENT_TIMEOUT_MS);
    const result = await withTimeout(run.wait(), SMART_RABBIT_AGENT_TIMEOUT_MS);
    if (result.status !== "finished" || !result.result) {
      throw new Error(result.error?.message || `Cursor run ended with ${result.status}`);
    }
    sessions[sessionId] = {
      agentId: agent.agentId,
      lastRunId: result.id,
      mode,
      updatedAt: new Date().toISOString(),
    };
    await writeSmartRabbitSessions(sessions);
    await appendSmartRabbitChatLog({
      date,
      sessionId,
      mode,
      message,
      response: result.result,
      agentId: agent.agentId,
      runId: result.id,
    });
    return {
      reply: result.result,
      agentId: agent.agentId,
      runId: result.id,
      model: result.model?.id || MODEL,
      mode,
      knowledge: {
        available: knowledge.available,
        query: knowledge.query,
        error: knowledge.error,
        results: knowledge.results.map((r) => ({ path: r.path, heading: r.heading || null })),
      },
      businessContext: {
        sections: businessContext.sections.map((s) => ({ key: s.key, title: s.title, freshness: s.freshness })),
        warnings: businessContext.warnings,
      },
    };
  } finally {
    await disposeAgent(agent);
  }
}

async function openAgent(date, existingId) {
  const options = {
    apiKey: getCursorApiKey(),
    model: { id: MODEL },
    name: `AI尊徳・キングダムOS ${date}`,
    mode: "plan",
    local: {
      cwd: REPO_ROOT,
      settingSources: ["project"],
      sandboxOptions: { enabled: true },
    },
  };

  if (existingId) {
    try {
      return { agent: await Agent.resume(existingId, options), firstTurn: false };
    } catch (error) {
      if (error?.code !== "agent_not_found") throw error;
    }
  }
  return { agent: await Agent.create(options), firstTurn: true };
}

async function disposeAgent(agent) {
  if (!agent) return;
  if (typeof agent[Symbol.asyncDispose] === "function") {
    await agent[Symbol.asyncDispose]();
  } else {
    agent.close();
  }
}

function markdownQuote(text) {
  return String(text || "")
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

async function appendChatLog({ date, message, event, response, agentId, runId }) {
  await fsp.mkdir(CHAT_LOG_DIR, { recursive: true });
  const file = path.join(CHAT_LOG_DIR, `sontoku-${date}.md`);
  let exists = true;
  try {
    await fsp.access(file);
  } catch {
    exists = false;
  }
  const time = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const header = exists
    ? ""
    : `# AI尊徳・キングダムOS 対話ログ — ${date}\n\n> Cursor SDK agent: ${agentId}\n> キングダムOSから自動記録。要約は \`daily_governance/sontoku_session_log.md\` に残す。\n\n`;
  const userText = event === "open" ? "今日の計画を開いた" : message;
  const entry = `## ${time}\n\n**今さん**\n\n${markdownQuote(userText)}\n\n**尊徳**\n\n${markdownQuote(response)}\n\n<!-- run: ${runId} -->\n\n`;
  await fsp.appendFile(file, `${header}${entry}`, "utf8");
}

async function enrichScheduleContext(context) {
  try {
    const st = await gcal.status();
    if (!st.connected) {
      context.schedule = { connected: false, note: "Googleカレンダー未接続" };
      return context;
    }
    const upcoming = await gcal.upcoming(2);
    context.schedule = {
      connected: true,
      upcoming: upcoming.slice(0, 15),
      remindersMinutes: st.remindersMinutes,
    };
  } catch (error) {
    context.schedule = {
      connected: false,
      error: error.code || error.message || "schedule_error",
    };
  }
  return context;
}

async function runSontokuTurn(payload) {
  const { date, event = "message" } = payload;
  const message = String(payload.message || "").trim();
  const context = await enrichScheduleContext(normalizeContext(payload.context));
  const sessions = await readSessions();
  const { agent, firstTurn } = await openAgent(date, sessions[date]?.agentId);
  let run;
  try {
    const prompt = `${firstTurn ? `${await basePrompt(date)}\n\n` : ""}${turnPrompt({
      date,
      message,
      event,
      context,
      firstTurn,
    })}`;
    run = await agent.send(prompt, { mode: "plan" });
    const result = await run.wait();
    if (result.status !== "finished" || !result.result) {
      throw new Error(result.error?.message || `Cursor run ended with ${result.status}`);
    }
    sessions[date] = {
      agentId: agent.agentId,
      lastRunId: result.id,
      updatedAt: new Date().toISOString(),
    };
    await writeSessions(sessions);
    await appendChatLog({
      date,
      message,
      event,
      response: result.result,
      agentId: agent.agentId,
      runId: result.id,
    });
    return {
      reply: result.result,
      agentId: agent.agentId,
      runId: result.id,
      model: result.model?.id || MODEL,
    };
  } finally {
    await disposeAgent(agent);
  }
}

async function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.resolve(APP_DIR, `.${pathname}`);
  if (!file.startsWith(`${APP_DIR}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) throw Object.assign(new Error("not_file"), { code: "ENOENT" });
    const taskboardToken = process.env.TASKBOARD_TOKEN || "";
    if (taskboardToken && path.basename(file) === "index.html") {
      const html = (await fsp.readFile(file, "utf8")).replace(
        "<head>",
        `<head>\n  <script>window.TASKBOARD_TOKEN = ${JSON.stringify(taskboardToken)};</script>`
      );
      res.writeHead(200, { "Content-Type": MIME_TYPES[".html"], "Cache-Control": "no-cache" });
      res.end(html);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    if (error.code !== "ENOENT") console.error(error);
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

    if (
      (url.pathname.startsWith("/api/state") ||
        url.pathname.startsWith("/api/sontoku") ||
        url.pathname.startsWith("/api/smart-rabbit") ||
        url.pathname.startsWith("/api/appointments")) &&
      !isAuthorized(req)
    ) {
      json(res, 401, { error: "unauthorized", message: "認証トークンが正しくありません。" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/info") {
      const access = getAccessUrls();
      const gcalStatus = await gcal.status().catch(() => ({ configured: false, connected: false }));
      json(res, 200, {
        sync: true,
        port: PORT,
        ...access,
        sontokuConnected: hasCursorApiKey(),
        smartRabbitConnected: hasCursorApiKey(),
        cursorApiConfigured: hasCursorApiKey(),
        gcal: gcalStatus,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      const record = await readStateRecord();
      json(res, 200, record);
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/state") {
      try {
        const body = await readJsonBody(req);
        if (!body || typeof body !== "object" || !body.data) {
          json(res, 400, { error: "invalid_state", message: "保存データが正しくありません。" });
          return;
        }
        const result = await writeStateRecord(body);
        if (result.conflict) {
          json(res, 409, {
            error: "state_conflict",
            message: "別の端末で更新がありました。最新データを読み込みます。",
            updatedAt: result.updatedAt,
            data: result.data,
          });
          return;
        }
        json(res, 200, { updatedAt: result.updatedAt, data: result.data });
      } catch (error) {
        console.error("[state]", error);
        json(res, 500, { error: "state_save_failed", message: "データ保存に失敗しました。" });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/sontoku/status") {
      json(res, 200, {
        connected: hasCursorApiKey(),
        provider: "Cursor SDK",
        model: MODEL,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sontoku") {
      if (!hasCursorApiKey()) {
        json(res, 503, {
          error: "cursor_api_key_missing",
          message: "CURSOR_API_KEYが未設定です。.env.localを設定してキングダムOSを再起動してください。",
        });
        return;
      }
      try {
        const body = await readJsonBody(req);
        if (!validDate(body.date)) {
          json(res, 400, { error: "invalid_date", message: "日付が正しくありません。" });
          return;
        }
        if (body.event !== "open" && !String(body.message || "").trim()) {
          json(res, 400, { error: "empty_message", message: "メッセージを入力してください。" });
          return;
        }
        if (!checkSontokuRateLimit(body.date)) {
          json(res, 429, {
            error: "rate_limited",
            message: "短時間に呼び出しが多すぎます。1分待って再試行してください。",
          });
          return;
        }
        const result = await enqueueByDate(body.date, () => runSontokuTurn(body));
        json(res, 200, result);
      } catch (error) {
        console.error("[AI尊徳]", error);
        const authError =
          error instanceof AuthenticationError ||
          (error instanceof CursorAgentError && /auth|api.?key|unauthorized/i.test(error.message));
        json(res, authError ? 401 : 500, {
          error: authError ? "cursor_auth_failed" : "sontoku_run_failed",
          message: authError
            ? "Cursor APIキーを確認してください。"
            : "AI尊徳との接続に失敗しました。ターミナルのエラーを確認してください。",
        });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/smart-rabbit/status") {
      json(res, 200, {
        connected: hasCursorApiKey(),
        provider: "Cursor SDK",
        model: MODEL,
        modes: knowledgeSearch.listModes(),
      });
      return;
    }

    // Phase 2A-15: 実AIを呼ばずにモード別の業務コンテキストだけを確認するプレビュー。
    if (req.method === "GET" && url.pathname === "/api/smart-rabbit/context") {
      try {
        const mode = url.searchParams.get("mode") || "";
        if (!knowledgeSearch.MODE_CONFIG[mode]) {
          json(res, 400, {
            error: "invalid_mode",
            message: `不正なmodeです。利用可能: ${Object.keys(knowledgeSearch.MODE_CONFIG).join(", ")}`,
          });
          return;
        }
        const stateRecord = await readStateRecord();
        const context = smartRabbitContext.buildSmartRabbitContext({
          mode,
          state: stateRecord.data || {},
          userMessage: "",
          knowledgeResults: null,
          now: new Date(),
        });
        json(res, 200, {
          mode,
          generatedAt: context.generatedAt,
          charLimit: context.charLimit,
          sections: context.sections,
          warnings: context.warnings,
          sourceSummary: context.sourceSummary,
        });
      } catch (error) {
        console.error("[smart-rabbit context preview]", error);
        json(res, 500, { error: "context_preview_failed", message: "コンテキストの取得に失敗しました。" });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/smart-rabbit") {
      if (!hasCursorApiKey()) {
        json(res, 503, {
          error: "cursor_api_key_missing",
          message: "CURSOR_API_KEYが未設定です。.env.localを設定してキングダムOSを再起動してください。",
        });
        return;
      }
      try {
        const body = await readJsonBody(req);
        if (!validDate(body.date)) {
          json(res, 400, { error: "invalid_date", message: "日付が正しくありません。" });
          return;
        }
        const trimmedMessage = String(body.message || "").trim();
        if (!trimmedMessage) {
          json(res, 400, { error: "empty_message", message: "メッセージを入力してください。" });
          return;
        }
        const sessionId = String(body.sessionId || "").trim();
        if (!sessionId) {
          json(res, 400, { error: "missing_session", message: "sessionIdが必要です。" });
          return;
        }
        const messageId = String(body.messageId || "").trim() || null;
        const cached = getCachedSmartRabbitResult(messageId);
        if (cached) {
          json(res, 200, cached);
          return;
        }
        if (!checkSmartRabbitRateLimit(sessionId)) {
          json(res, 429, {
            error: "rate_limited",
            message: "短時間に呼び出しが多すぎます。1分待って再試行してください。",
          });
          return;
        }
        const result = await enqueueByDate(`smartrabbit:${sessionId}`, () =>
          runSmartRabbitTurn({ ...body, message: trimmedMessage, sessionId })
        );
        cacheSmartRabbitResult(messageId, result);
        json(res, 200, result);
      } catch (error) {
        console.error("[スマートラビット]", error);
        const authError =
          error instanceof AuthenticationError ||
          (error instanceof CursorAgentError && /auth|api.?key|unauthorized/i.test(error.message));
        const timeoutError = error?.code === "timeout";
        json(res, authError ? 401 : timeoutError ? 504 : 500, {
          error: authError ? "cursor_auth_failed" : timeoutError ? "smart_rabbit_timeout" : "smart_rabbit_run_failed",
          message: authError
            ? "Cursor APIキーを確認してください。"
            : timeoutError
              ? "応答がタイムアウトしました。もう一度お試しください。"
              : "スマートラビットとの接続に失敗しました。ターミナルのエラーを確認してください。",
        });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gcal/status") {
      try {
        json(res, 200, await gcal.status());
      } catch (error) {
        json(res, 500, { error: "gcal_status_failed", message: error.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gcal/auth") {
      try {
        if (!gcal.configured()) {
          json(res, 503, {
            error: "google_oauth_not_configured",
            message: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET を .env.local に設定してください。",
            redirectUri: gcal.redirectUri(),
          });
          return;
        }
        json(res, 200, { url: gcal.authUrl() });
      } catch (error) {
        json(res, 500, { error: "gcal_auth_failed", message: error.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gcal/callback") {
      try {
        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<p>認可コードがありません。</p>");
          return;
        }
        await gcal.exchangeCode(code);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<!doctype html><meta charset=utf-8><title>接続完了</title><p>Googleカレンダー接続が完了しました。このタブを閉じ、キングダムOSを再読み込みしてください。</p><script>setTimeout(()=>location.href='/',1200)</script>"
        );
      } catch (error) {
        console.error("[gcal/callback]", error);
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<p>接続に失敗しました: ${String(error.message || error)}</p>`);
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gcal/upcoming") {
      try {
        const days = Number(url.searchParams.get("days") || 2);
        const items = await gcal.upcoming(Number.isFinite(days) ? days : 2);
        json(res, 200, { items });
      } catch (error) {
        const code = error.code === "google_not_connected" ? 503 : 500;
        json(res, code, {
          error: error.code || "gcal_upcoming_failed",
          message:
            error.code === "google_not_connected"
              ? "Googleカレンダー未接続です。「接続」から認可してください。"
              : error.message,
        });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/gcal/today") {
      try {
        const day = url.searchParams.get("day") || undefined;
        const result = await gcal.todayEvents(day);
        json(res, 200, result);
      } catch (error) {
        const code = error.code === "google_not_connected" ? 503 : 500;
        json(res, code, {
          error: error.code || "gcal_today_failed",
          message:
            error.code === "google_not_connected"
              ? "Googleカレンダー未接続です。「接続」から認可してください。"
              : error.message,
        });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/appointments") {
      try {
        const body = await readJsonBody(req);
        const title = String(body.title || "").trim();
        const startAt = body.startAt;
        const endAt = body.endAt;
        if (!title || !startAt || !endAt) {
          json(res, 400, {
            error: "invalid_appointment",
            message: "タイトル・開始・終了が必要です。",
          });
          return;
        }
        if (!(new Date(startAt) < new Date(endAt))) {
          json(res, 400, {
            error: "invalid_time_range",
            message: "終了は開始より後にしてください。",
          });
          return;
        }

        const conflicts = await gcal.findConflicts(startAt, endAt);
        if (conflicts.length && !body.force) {
          json(res, 409, {
            error: "schedule_conflict",
            message: "同じ時間帯に別の予定があります。",
            conflicts,
          });
          return;
        }

        const created = await gcal.createEvent({
          title,
          startAt,
          endAt,
          location: String(body.location || "").trim(),
          notes: String(body.notes || "").trim(),
        });

        const appointment = {
          id: `ap-${Date.now().toString(36)}`,
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          location: String(body.location || "").trim(),
          notes: String(body.notes || "").trim(),
          gcalEventId: created.id,
          gcalHtmlLink: created.htmlLink,
          remindersMinutes: created.remindersMinutes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        json(res, 200, {
          appointment,
          conflictsWarned: conflicts,
        });
      } catch (error) {
        console.error("[appointments]", error);
        const map = {
          google_not_connected: [503, "Googleカレンダー未接続です。先に接続してください。"],
          google_oauth_not_configured: [503, "Google OAuth が未設定です。GOOGLE_CALENDAR.md を参照。"],
        };
        const hit = map[error.code];
        json(res, hit ? hit[0] : 500, {
          error: error.code || "appointment_create_failed",
          message: hit ? hit[1] : error.message || "予定の登録に失敗しました。",
        });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/appointments/check") {
      try {
        const body = await readJsonBody(req);
        const conflicts = await gcal.findConflicts(body.startAt, body.endAt, {
          excludeEventId: body.excludeEventId,
        });
        json(res, 200, { conflicts });
      } catch (error) {
        json(res, error.code === "google_not_connected" ? 503 : 500, {
          error: error.code || "conflict_check_failed",
          message: error.message,
        });
      }
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD, PUT, POST" });
      res.end();
      return;
    }
    await serveStatic(req, res, url);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    const { urls, tailscaleUrl, mobileUrl } = getAccessUrls();
    console.log("キングダムOS:");
    urls.forEach((entry) => console.log(`  ${entry}`));
    console.log(`携帯（同じWi-Fi）: ${mobileUrl}`);
    if (tailscaleUrl) {
      console.log(`携帯（外出先）: ${tailscaleUrl}`);
    } else {
      console.log("携帯（外出先）: Tailscale未設定 → apps/taskboard/setup-tailscale.sh を参照");
    }
    console.log(
      hasCursorApiKey()
        ? `AI尊徳 / スマートラビット: Cursor SDK接続準備済み（model: ${MODEL}）`
        : "AI尊徳 / スマートラビット: 未接続（apps/taskboard/.env.local に CURSOR_API_KEY を設定してください）"
    );
  });
}

module.exports = {
  createServer,
  normalizeContext,
  turnPrompt,
  validDate,
  sanitizeStateData,
  readStateRecord,
  writeStateRecord,
  getLanUrls,
  getTailscaleUrl,
  getAccessUrls,
  isAuthorized,
  checkSontokuRateLimit,
  computeTrackRecord,
  normalizeSmartRabbitContext,
  smartRabbitTurnPrompt,
  knowledgeBlock,
  checkSmartRabbitRateLimit,
  cacheSmartRabbitResult,
  getCachedSmartRabbitResult,
  contentHashOf,
  sanitizeBusiness,
  hasCursorApiKey,
  getCursorApiKey,
  loadLocalEnv,
};
