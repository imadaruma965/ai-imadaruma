const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { Agent, CursorAgentError, AuthenticationError } = require("@cursor/sdk");
const gcal = require("./gcal.cjs");

const APP_DIR = __dirname;
const REPO_ROOT = path.resolve(APP_DIR, "../..");
const DATA_DIR = path.join(APP_DIR, "data");
const SESSION_FILE = path.join(DATA_DIR, ".sontoku-sessions.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const CHAT_LOG_DIR = path.join(REPO_ROOT, "daily_governance", "chat_logs");
const PORT = Number(process.env.GYOMU_TOCHI_PORT || 8765);
const HOST = process.env.GYOMU_TOCHI_HOST || "0.0.0.0";
const MODEL = process.env.SONTOKU_MODEL || "auto";
const MAX_BODY_BYTES = 1024 * 1024;
const SONTOKU_RATE_LIMIT_PER_MINUTE = 10;
const SONTOKU_RATE_LIMIT_WINDOW_MS = 60 * 1000;

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
    incidents: Array.isArray(data.incidents) ? data.incidents : [],
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    personalFinance:
      data.personalFinance && typeof data.personalFinance === "object"
        ? { entries: Array.isArray(data.personalFinance.entries) ? data.personalFinance.entries : [] }
        : { entries: [] },
    appointments: Array.isArray(data.appointments) ? data.appointments : [],
    liabilities: Array.isArray(data.liabilities) ? data.liabilities : [],
    fiscalMeta:
      data.fiscalMeta && typeof data.fiscalMeta === "object"
        ? {
            defenseLine: data.fiscalMeta.defenseLine == null || data.fiscalMeta.defenseLine === ""
              ? null
              : Number(data.fiscalMeta.defenseLine),
            note: String(data.fiscalMeta.note || ""),
          }
        : { defenseLine: null, note: "" },
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

  return `あなたは統治手帳のAI尊徳である。以下の正本と運用規則を採用し、今さんの実行マネージャーとして対話する。

重要な境界:
- 戦略を変更しない。戦略判断はAI栄一の領分である。
- この対話ではファイル編集、シェル実行、コミットなどのツール操作を行わない。
- 統治手帳から渡された最新の任務・進捗を事実として扱う。
- 予定・約束は Googleカレンダー連携の情報を事実として扱う。時間が重なる予定（バッティング）があれば、任務の話より先に短く警告する。
- 応答は日本語で簡潔にし、冒頭は必ず「尊徳:」とする。
- 定型文ではなく、今さんの発言と現在情報を踏まえて自然に応答する。
- 分からないことを推測で断定せず、実行に必要な問いを一つずつ返す。
- 本日は ${date}。

【直近14日間の実績（統治手帳データより・${track.windowStartISO}〜${date}）】
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
  return `${firstTurn ? "ここから統治手帳での継続対話を開始する。\n\n" : ""}【現在時刻・統治手帳の最新情報】
日付: ${date}
${JSON.stringify(context, null, 2)}

【今回の入力】
${request}

AI尊徳として、今さんに直接返答すること。`;
}

async function openAgent(date, existingId) {
  const options = {
    apiKey: process.env.CURSOR_API_KEY,
    model: { id: MODEL },
    name: `AI尊徳・統治手帳 ${date}`,
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
    : `# AI尊徳・統治手帳 対話ログ — ${date}\n\n> Cursor SDK agent: ${agentId}\n> 統治手帳から自動記録。要約は \`daily_governance/sontoku_session_log.md\` に残す。\n\n`;
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
        sontokuConnected: Boolean(process.env.CURSOR_API_KEY),
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
        connected: Boolean(process.env.CURSOR_API_KEY),
        provider: "Cursor SDK",
        model: MODEL,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sontoku") {
      if (!process.env.CURSOR_API_KEY) {
        json(res, 503, {
          error: "cursor_api_key_missing",
          message: "CURSOR_API_KEYが未設定です。.env.localを設定して統治手帳を再起動してください。",
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
          "<!doctype html><meta charset=utf-8><title>接続完了</title><p>Googleカレンダー接続が完了しました。このタブを閉じ、統治手帳を再読み込みしてください。</p><script>setTimeout(()=>location.href='/',1200)</script>"
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
    console.log("統治手帳:");
    urls.forEach((entry) => console.log(`  ${entry}`));
    console.log(`携帯（同じWi-Fi）: ${mobileUrl}`);
    if (tailscaleUrl) {
      console.log(`携帯（外出先）: ${tailscaleUrl}`);
    } else {
      console.log("携帯（外出先）: Tailscale未設定 → apps/taskboard/setup-tailscale.sh を参照");
    }
    console.log(
      process.env.CURSOR_API_KEY
        ? `AI尊徳: Cursor SDK接続準備済み（model: ${MODEL}）`
        : "AI尊徳: 未接続（apps/taskboard/.env.local に CURSOR_API_KEY を設定してください）"
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
};
