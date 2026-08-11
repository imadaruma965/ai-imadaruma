"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// Phase 2A-10: モードごとの目安上限(日本語文字数)。厳密値ではなく、
// 既存のSmart Rabbit promptの分量を見ての目安。
const MODE_CHAR_LIMITS = {
  general: 2000,
  today: 1500,
  sales: 2000,
  instagram: 1500,
  research: 2000,
  product: 2000,
  finance: 1500,
};

// モードごとに使うsectionと優先順位(先に書いた方が優先。文字数超過時は末尾から落とす)。
const MODE_SECTION_ORDER = {
  general: ["goals", "today_priority", "kpi", "sales", "finance", "projects", "issues"],
  today: ["today_priority", "deadlines", "issues", "kpi", "sontoku_progress", "yesterday_review"],
  sales: ["sales", "products", "finance_gap", "goals"],
  instagram: ["instagram_profile", "kpi", "sales_link"],
  research: ["research_projects", "goals"],
  product: ["products", "sales"],
  finance: ["finance", "sales_summary", "goals"],
};

const FACT_MAX_LEN = 140;
const SECTION_FACT_CAP = 5;
const STALE_DAYS = 14;

function clipText(value, max = FACT_MAX_LEN) {
  const text = String(value == null ? "" : value).trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function toISODate(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// updatedAtが無い/壊れている場合はunknown。閾値(既定14日)より古ければstale。
function freshnessOf(updatedAt, now) {
  if (!updatedAt) return "unknown";
  const t = new Date(updatedAt);
  if (Number.isNaN(t.getTime())) return "unknown";
  const days = (now.getTime() - t.getTime()) / (24 * 60 * 60 * 1000);
  if (days < 0) return "fresh";
  return days > STALE_DAYS ? "stale" : "fresh";
}

function readTextSafe(absPath) {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch {
    return "";
  }
}

function statMtimeSafe(absPath) {
  try {
    return fs.statSync(absPath).mtime.toISOString();
  } catch {
    return null;
  }
}

// 02_経産省/strategy/*.md はKingdom OSの現行の正式ドキュメント(Knowledgeとは別の業務stateの一次情報)。
// state.business.* が未入力の間はここから最小限の事実を抽出するフォールバックとして使う。
function loadDoc(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return { text: readTextSafe(abs), updatedAt: statMtimeSafe(abs), source: relPath };
}

function extractRoadmapGoal(text) {
  const deadline = /\|\s*\*\*期限\*\*\s*\|\s*([^|]+?)\s*\|/.exec(text);
  const goal = /\|\s*\*\*目標\*\*\s*\|\s*([^|]+?)\s*\|/.exec(text);
  const facts = [];
  if (deadline) facts.push(`期限: ${deadline[1].replace(/\*\*/g, "").trim()}`);
  if (goal) facts.push(`目標: ${goal[1].replace(/\*\*/g, "").trim()}`);
  return facts;
}

// "## N. 商品名" セクションごとに、直後の基本情報テーブルから商品名/価格/判断だけ抜き出す。
// テーブル形式が変わっても例外を出さず、拾えたものだけ返す。
function extractOfferProducts(text, cap = 4) {
  const products = [];
  const headingRe = /^##\s*\d+\.\s*(.+)$/gm;
  const headings = [];
  let m;
  while ((m = headingRe.exec(text))) {
    headings.push({ name: m[1].trim(), index: m.index });
  }
  for (let i = 0; i < headings.length && products.length < cap; i += 1) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : text.length;
    const block = text.slice(start, end);
    const priceMatch = /\|\s*\*\*価格\*\*\s*\|\s*([^|]+?)\s*\|/.exec(block);
    const judgmentMatch = /\|\s*\*\*AI栄一の判断\*\*\s*\|\s*([^|]+?)\s*\|/.exec(block);
    const price = priceMatch ? priceMatch[1].trim() : "未設定";
    const judgment = judgmentMatch ? judgmentMatch[1].trim() : "";
    products.push({
      name: headings[i].name,
      price,
      judgment,
    });
  }
  return products;
}

function extractInstagramProfile(text) {
  const facts = [];
  const primary = /\*\*主軸\*\*[\s\S]*?```text\s*([\s\S]*?)```/.exec(text);
  const secondary = /\*\*副軸\*\*[\s\S]*?```text\s*([\s\S]*?)```/.exec(text);
  if (primary) facts.push(`主軸: ${primary[1].trim()}`);
  if (secondary) facts.push(`副軸: ${secondary[1].trim()}`);
  const targetRow = /\|\s*主\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/.exec(text);
  if (targetRow) facts.push(`主ターゲット: ${targetRow[1].trim()}(求めるもの: ${targetRow[2].trim()})`);
  return facts;
}

function sectionOf(key, title, facts, { updatedAt = null, source = null, now }) {
  const clean = (facts || [])
    .filter((f) => f !== null && f !== undefined && String(f).trim() !== "")
    .slice(0, SECTION_FACT_CAP)
    .map((f) => clipText(f));
  if (!clean.length) return null;
  return {
    key,
    title,
    facts: clean,
    updatedAt: updatedAt || null,
    source: source || null,
    freshness: freshnessOf(updatedAt, now),
  };
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function buildGoalsSection(now) {
  return safe(() => {
    const doc = loadDoc("02_経産省/strategy/roadmap_500k.md");
    const facts = extractRoadmapGoal(doc.text);
    return sectionOf("goals", "最上位目標", facts, { updatedAt: doc.updatedAt, source: doc.source, now });
  }, null);
}

function buildTodayPrioritySection(state, now) {
  return safe(() => {
    const today = toISODate(now);
    const dayKey = `day:${today}`;
    const plan = (state.plans && state.plans[dayKey]) || null;
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const onToday = tasks.filter((t) => t && t.onToday && t.status !== "done");
    const facts = [];
    if (plan && String(plan.goal || "").trim()) facts.push(`今日の一事: ${plan.goal.trim()}`);
    if (onToday.length) facts.push(`今日の任務: ${onToday.length}件`);
    onToday.slice(0, 3).forEach((t) => facts.push(t.title || "(無題)"));
    return sectionOf("today_priority", "今日の優先順位", facts, {
      updatedAt: plan ? today : null,
      source: "state.plans / state.tasks",
      now,
    });
  }, null);
}

function buildDeadlinesSection(state, now) {
  return safe(() => {
    const today = toISODate(now);
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const soonISO = toISODate(soon);
    const tasks = (Array.isArray(state.tasks) ? state.tasks : []).filter(
      (t) => t && t.status !== "done" && t.dueDate && t.dueDate >= today && t.dueDate <= soonISO
    );
    tasks.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    const facts = tasks.slice(0, 5).map((t) => `${t.dueDate}: ${t.title || "(無題)"}`);
    return sectionOf("deadlines", "締切(3日以内)", facts, { updatedAt: today, source: "state.tasks", now });
  }, null);
}

function buildIssuesSection(state, now) {
  return safe(() => {
    const today = toISODate(now);
    const overdue = (Array.isArray(state.tasks) ? state.tasks : []).filter(
      (t) => t && t.status !== "done" && t.dueDate && t.dueDate < today
    );
    const facts = overdue.slice(0, 5).map((t) => `期限超過(${t.dueDate}): ${t.title || "(無題)"}`);
    return sectionOf("issues", "未完了の重要課題(期限超過・繰越)", facts, {
      updatedAt: today,
      source: "state.tasks",
      now,
    });
  }, null);
}

function buildKpiSection(state, now) {
  return safe(() => {
    const board = state.board || {};
    const facts = [];
    const ig = board?.diplomacy?.ig;
    if (ig !== undefined && ig !== null) facts.push(`Instagramフォロワー: ${ig}`);
    const li = board?.diplomacy?.li;
    if (li !== undefined && li !== null) facts.push(`LinkedIn: ${li}`);
    const weight = board?.naisei?.weight;
    if (weight !== undefined && weight !== null) facts.push(`体重: ${weight}`);
    const today = toISODate(now);
    const todayKpi = state.kpis && state.kpis[today];
    if (todayKpi && typeof todayKpi === "object") {
      Object.entries(todayKpi)
        .slice(0, 3)
        .forEach(([k, v]) => facts.push(`本日KPI ${k}: ${v}`));
    }
    return sectionOf("kpi", "重要KPI", facts, { updatedAt: null, source: "state.board / state.kpis", now });
  }, null);
}

function buildSalesSection(state, now) {
  return safe(() => {
    const records = Array.isArray(state.salesPipeline) ? state.salesPipeline : [];
    if (!records.length) {
      return sectionOf("sales", "営業の現在地", ["営業パイプライン: 未登録(0件)"], {
        updatedAt: null,
        source: "state.salesPipeline",
        now,
      });
    }
    const counts = {};
    let estimatedTotal = 0;
    let latestUpdatedAt = null;
    records.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
      if (typeof r.estimatedAmount === "number" && !["won", "lost"].includes(r.status)) {
        estimatedTotal += r.estimatedAmount;
      }
      if (r.updatedAt && (!latestUpdatedAt || r.updatedAt > latestUpdatedAt)) latestUpdatedAt = r.updatedAt;
    });
    const today = toISODate(now);
    const overdue = records.filter(
      (r) => r.nextActionDate && r.nextActionDate < today && !["won", "lost"].includes(r.status)
    );
    const facts = [
      `件数: ${records.length}件(${Object.entries(counts)
        .map(([s, c]) => `${s}:${c}`)
        .join(" / ")})`,
      `見込売上合計(open): ${estimatedTotal}円`,
    ];
    if (overdue.length) facts.push(`次回対応期限超過: ${overdue.length}件`);
    overdue
      .slice(0, 3)
      .forEach((r) => facts.push(`要連絡: ${r.companyName || "(社名未登録)"} / ${r.nextAction || "(次アクション未登録)"}`));
    return sectionOf("sales", "営業の現在地", facts, {
      updatedAt: latestUpdatedAt,
      source: "state.salesPipeline",
      now,
    });
  }, null);
}

function buildFinanceGapSection(state, now) {
  return safe(() => {
    const fm = state.fiscalMeta || {};
    const numOrUnset = (v) => (v === null || v === undefined ? "未登録" : `${v}円`);
    const facts = [
      `現在残高: ${numOrUnset(fm.currentBalance)}`,
      `防衛ライン: ${numOrUnset(fm.defenseLine)}`,
    ];
    if (fm.currentBalance != null && fm.defenseLine != null) {
      facts.push(`余裕: ${fm.currentBalance - fm.defenseLine}円`);
    }
    return sectionOf("finance_gap", "財政の要点(営業判断用)", facts, {
      updatedAt: null,
      source: "state.fiscalMeta",
      now,
    });
  }, null);
}

function buildFinanceSection(state, now) {
  return safe(() => {
    const fm = state.fiscalMeta || {};
    const numOrUnset = (v) => (v === null || v === undefined ? "未登録" : `${v}円`);
    const facts = [
      `現在残高: ${numOrUnset(fm.currentBalance)}`,
      `確定入金: ${numOrUnset(fm.confirmedInflow)}`,
      `入金予定: ${numOrUnset(fm.expectedInflow)}`,
      `固定費: ${numOrUnset(fm.fixedCosts)}`,
      `防衛ライン: ${numOrUnset(fm.defenseLine)}`,
    ];
    const liabilities = Array.isArray(state.liabilities) ? state.liabilities : [];
    const overdueLiabilities = liabilities.filter((l) => l && l.status === "overdue");
    if (overdueLiabilities.length) facts.push(`未払(overdue): ${overdueLiabilities.length}件`);
    return sectionOf("finance", "財政スナップショット", facts, {
      updatedAt: null,
      source: "state.fiscalMeta / state.liabilities",
      now,
    });
  }, null);
}

function buildFinanceSummarySection(state, now) {
  return safe(() => {
    const fm = state.fiscalMeta || {};
    const goalGap = fm.currentBalance != null ? `月50万との差額計算には finance_board.md 参照` : "未登録";
    return sectionOf("finance_summary", "財政要約", [`月50万との差額: ${goalGap}`], {
      updatedAt: null,
      source: "state.fiscalMeta",
      now,
    });
  }, null);
}

function buildProjectsSection(state, now) {
  return safe(() => {
    const tasks = (Array.isArray(state.tasks) ? state.tasks : []).filter((t) => t && t.status !== "done");
    const byCategory = {};
    tasks.forEach((t) => {
      const cat = t.category || "other";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    const top = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, count]) => `${cat}: ${count}件`);
    return sectionOf("projects", "進行中の主要プロジェクト", top, {
      updatedAt: null,
      source: "state.tasks",
      now,
    });
  }, null);
}

function buildSontokuProgressSection(state, now) {
  return safe(() => {
    const today = toISODate(now);
    const key = `day:${today}`;
    const messages = (state.sontokuChat && state.sontokuChat[key] && state.sontokuChat[key]) || [];
    const list = Array.isArray(messages) ? messages : [];
    const lastSontoku = [...list].reverse().find((m) => m.role === "sontoku");
    if (!lastSontoku) {
      return sectionOf("sontoku_progress", "尊徳側の進捗", ["本日の尊徳対話: 未登録"], {
        updatedAt: null,
        source: "state.sontokuChat",
        now,
      });
    }
    return sectionOf("sontoku_progress", "尊徳側の進捗", [clipText(lastSontoku.text, 200)], {
      updatedAt: lastSontoku.at || null,
      source: "state.sontokuChat",
      now,
    });
  }, null);
}

function buildYesterdayReviewSection(now) {
  return safe(() => {
    const doc = loadDoc("03_内務省/daily_governance/night_review.md");
    if (!doc.text) return null;
    const entries = [...doc.text.matchAll(/^##\s*(\d{4}-\d{2}-\d{2}).*$/gm)];
    if (!entries.length) return null;
    const last = entries[entries.length - 1];
    const start = last.index;
    const end = entries.length > 1 ? doc.text.length : doc.text.length;
    const block = doc.text.slice(start, Math.min(start + 400, end));
    return sectionOf("yesterday_review", "直近の振り返り", [clipText(block.replace(/^##.*$/m, "").trim(), 200)], {
      updatedAt: last[1],
      source: doc.source,
      now,
    });
  }, null);
}

function buildInstagramProfileSection(state, now) {
  return safe(() => {
    const business = state.business && state.business.instagram;
    const facts = [];
    let updatedAt = null;
    let source = "02_経産省/strategy/instagram_growth_plan.md";
    if (business && (business.brandName || business.tagline || (business.pillars || []).length)) {
      if (business.brandName) facts.push(`ブランド名: ${business.brandName}`);
      if (business.tagline) facts.push(`タグライン: ${business.tagline}`);
      if (Array.isArray(business.pillars) && business.pillars.length) {
        facts.push(`投稿柱: ${business.pillars.slice(0, 4).join(" / ")}`);
      }
      updatedAt = business.updatedAt || null;
      source = "state.business.instagram";
    } else {
      const doc = loadDoc("02_経産省/strategy/instagram_growth_plan.md");
      facts.push(...extractInstagramProfile(doc.text));
      updatedAt = doc.updatedAt;
    }
    const ig = state.board?.diplomacy?.ig;
    if (ig !== undefined && ig !== null) facts.push(`現在フォロワー数: ${ig}`);
    return sectionOf("instagram_profile", "Instagramアカウント方針", facts, { updatedAt, source, now });
  }, null);
}

function buildSalesLinkSection(state, now) {
  return safe(() => {
    const records = Array.isArray(state.salesPipeline) ? state.salesPipeline : [];
    const igSourced = records.filter((r) => r.channel === "Instagram");
    const facts = [`Instagram経由の営業案件: ${igSourced.length}件`];
    return sectionOf("sales_link", "営業・商品への導線", facts, {
      updatedAt: null,
      source: "state.salesPipeline",
      now,
    });
  }, null);
}

function buildProductsSection(state, now) {
  return safe(() => {
    const business = Array.isArray(state.business && state.business.services) ? state.business.services : [];
    let facts = [];
    let updatedAt = null;
    let source = "02_経産省/strategy/offer_review.md";
    if (business.length) {
      facts = business
        .slice(0, 4)
        .map((p) => `${p.name || "(名称未登録)"}: ${p.price || "未設定"}${p.status ? ` / ${p.status}` : ""}`);
      source = "state.business.services";
    } else {
      const doc = loadDoc("02_経産省/strategy/offer_review.md");
      const products = extractOfferProducts(doc.text);
      facts = products.map((p) => `${p.name}: 価格 ${p.price}${p.judgment ? ` / ${p.judgment}` : ""}`);
      updatedAt = doc.updatedAt;
    }
    return sectionOf("products", "商品・サービス", facts, { updatedAt, source, now });
  }, null);
}

function buildResearchProjectsSection(state, now) {
  return safe(() => {
    const projects = Array.isArray(state.business && state.business.researchProjects)
      ? state.business.researchProjects
      : [];
    if (!projects.length) {
      return sectionOf(
        "research_projects",
        "調査中の案件(業務state)",
        ["未登録(state.business.researchProjectsは未使用)"],
        { updatedAt: null, source: "state.business.researchProjects", now }
      );
    }
    const facts = projects.slice(0, 5).map((p) => {
      const status = p.confirmed ? "確認済み" : "仮説・未確認";
      return `${p.theme || "(テーマ未登録)"}: ${status}${p.nextStep ? ` / 次: ${p.nextStep}` : ""}`;
    });
    const latest = projects.reduce((acc, p) => (p.updatedAt && p.updatedAt > acc ? p.updatedAt : acc), "");
    return sectionOf("research_projects", "調査中の案件(業務state)", facts, {
      updatedAt: latest || null,
      source: "state.business.researchProjects",
      now,
    });
  }, null);
}

const SECTION_BUILDERS = {
  goals: (state, now) => buildGoalsSection(now),
  today_priority: (state, now) => buildTodayPrioritySection(state, now),
  deadlines: (state, now) => buildDeadlinesSection(state, now),
  issues: (state, now) => buildIssuesSection(state, now),
  kpi: (state, now) => buildKpiSection(state, now),
  sales: (state, now) => buildSalesSection(state, now),
  finance_gap: (state, now) => buildFinanceGapSection(state, now),
  finance: (state, now) => buildFinanceSection(state, now),
  sales_summary: (state, now) => buildFinanceSummarySection(state, now),
  projects: (state, now) => buildProjectsSection(state, now),
  sontoku_progress: (state, now) => buildSontokuProgressSection(state, now),
  yesterday_review: (state, now) => buildYesterdayReviewSection(now),
  instagram_profile: (state, now) => buildInstagramProfileSection(state, now),
  sales_link: (state, now) => buildSalesLinkSection(state, now),
  products: (state, now) => buildProductsSection(state, now),
  research_projects: (state, now) => buildResearchProjectsSection(state, now),
};

function knowledgeSourceSummary(knowledgeResults) {
  if (!knowledgeResults) return null;
  if (!knowledgeResults.available) {
    return { type: "knowledge", available: false, note: knowledgeResults.error || "unavailable" };
  }
  return {
    type: "knowledge",
    available: true,
    query: knowledgeResults.query || "",
    count: Array.isArray(knowledgeResults.results) ? knowledgeResults.results.length : 0,
  };
}

// Phase 2A-2: モード別の業務コンテキストを構造化して返す。文字列化は contextToPromptText に分離。
function buildSmartRabbitContext({ mode, state, userMessage, knowledgeResults, now }) {
  const safeState = state && typeof state === "object" ? state : {};
  const effectiveNow = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const order = MODE_SECTION_ORDER[mode] || MODE_SECTION_ORDER.general;
  const limit = MODE_CHAR_LIMITS[mode] || MODE_CHAR_LIMITS.general;

  const warnings = [];
  const allSections = [];
  order.forEach((key) => {
    const builder = SECTION_BUILDERS[key];
    if (!builder) return;
    const section = builder(safeState, effectiveNow);
    if (section) {
      if (section.freshness === "stale") {
        warnings.push(`「${section.title}」は更新から${STALE_DAYS}日以上経過している可能性があります。断定しないこと。`);
      }
      allSections.push(section);
    }
  });

  // 文字数上限を超えたら優先度の低い(末尾の)sectionから落とす。
  const included = [];
  let used = 0;
  for (const section of allSections) {
    const sectionLen = section.facts.reduce((sum, f) => sum + f.length, section.title.length + 10);
    if (used + sectionLen > limit && included.length > 0) break;
    included.push(section);
    used += sectionLen;
    if (used >= limit) break;
  }

  const sourceSummary = included.map((s) => ({ type: "business_state", key: s.key, source: s.source, freshness: s.freshness }));
  const knowledgeSummary = knowledgeSourceSummary(knowledgeResults);
  if (knowledgeSummary) sourceSummary.push(knowledgeSummary);

  return {
    mode,
    generatedAt: effectiveNow.toISOString(),
    sections: included,
    warnings,
    sourceSummary,
    charLimit: limit,
    userMessagePreview: clipText(userMessage, 120),
  };
}

function contextToPromptText(context) {
  if (!context || !context.sections || !context.sections.length) {
    return "【業務コンテキスト】\n(利用可能な業務stateなし)";
  }
  const lines = ["【業務コンテキスト(state由来。ここにない事実を作らないこと)】"];
  context.sections.forEach((s) => {
    const freshnessNote = s.freshness === "stale" ? "(情報が古い可能性あり)" : s.freshness === "unknown" ? "(更新日時不明)" : "";
    lines.push(`■ ${s.title}${freshnessNote}`);
    s.facts.forEach((f) => lines.push(`  - ${f}`));
  });
  if (context.warnings.length) {
    lines.push("【注意】");
    context.warnings.forEach((w) => lines.push(`- ${w}`));
  }
  return lines.join("\n");
}

module.exports = {
  MODE_CHAR_LIMITS,
  MODE_SECTION_ORDER,
  STALE_DAYS,
  buildSmartRabbitContext,
  contextToPromptText,
  freshnessOf,
  clipText,
  extractRoadmapGoal,
  extractOfferProducts,
  extractInstagramProfile,
};
