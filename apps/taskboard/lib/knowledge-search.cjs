"use strict";

const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// imada-knowledge is a sibling repo on the same machine (not nested in this repo).
// Override with IMADA_KNOWLEDGE_VAULT_PATH if the two repos are not checked out
// as siblings under the same parent directory.
const DEFAULT_VAULT_ROOT = path.join(os.homedir(), "Documents", "imada-knowledge");
const VAULT_ROOT = process.env.IMADA_KNOWLEDGE_VAULT_PATH
  ? path.resolve(process.env.IMADA_KNOWLEDGE_VAULT_PATH)
  : DEFAULT_VAULT_ROOT;
const VAULT_LIB_PATH = path.join(VAULT_ROOT, "integrations", "imada-knowledge-mcp", "lib", "vault.mjs");

// 06_ダ・ヴィンチ図書館直下は「共通原理」のみ優先参照する運用のため folders には
// サブパスまで渡す(vault.mjs 側は path.normalize したprefix一致で判定する)。
const DEFAULT_CASCADE = [
  "01_意思決定",
  "02_国家事業",
  "03_国家叡智",
  "06_ダ・ヴィンチ図書館",
  "05_AI対話",
];

// Phase 1-3: モードごとにKnowledge検索の優先フォルダとAI向け観点を変える。
const MODE_CONFIG = {
  general: {
    label: "総合相談",
    folderOrder: DEFAULT_CASCADE,
    focus: [],
  },
  today: {
    label: "今日の統治",
    folderOrder: DEFAULT_CASCADE,
    focus: ["優先順位", "本日の任務", "期限超過"],
  },
  sales: {
    label: "営業",
    folderOrder: ["02_国家事業", "01_意思決定", "03_国家叡智", "06_ダ・ヴィンチ図書館", "05_AI対話"],
    focus: ["顧客", "提案", "価格", "案件", "営業履歴"],
  },
  instagram: {
    label: "Instagram",
    folderOrder: ["02_国家事業", "03_国家叡智", "01_意思決定", "06_ダ・ヴィンチ図書館", "05_AI対話"],
    focus: ["賢いウサギ", "AI自己統治", "ミドル再起", "投稿企画"],
  },
  research: {
    label: "リサーチ",
    folderOrder: ["03_国家叡智", "06_ダ・ヴィンチ図書館", "01_意思決定", "02_国家事業", "05_AI対話"],
    focus: ["根拠", "比較", "一次情報", "未確認事項"],
  },
  product: {
    label: "商品・サービス設計",
    folderOrder: ["02_国家事業", "03_国家叡智", "01_意思決定", "06_ダ・ヴィンチ図書館", "05_AI対話"],
    focus: ["商品設計", "サービス設計", "価格設定", "提供価値"],
  },
  finance: {
    label: "財政・優先順位",
    folderOrder: ["01_意思決定", "02_国家事業", "03_国家叡智", "06_ダ・ヴィンチ図書館", "05_AI対話"],
    focus: ["財政", "資金", "優先順位", "予算"],
  },
};

const DEFAULT_MODE = "general";

function listModes() {
  return Object.entries(MODE_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label, focus: cfg.focus }));
}

function resolveMode(mode) {
  return MODE_CONFIG[mode] ? mode : DEFAULT_MODE;
}

// 日本語は分かち書きされないため、句読点・記号・空白で区切り、
// 意味を持ちそうな2文字以上の断片を上位6件だけ抽出してAND検索クエリにする。
function extractQueryKeywords(message, max = 6) {
  const text = String(message || "");
  const chunks = text
    .split(/[\s、。,.!?！？「」『』（）()【】\n]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const unique = [...new Set(chunks)];
  unique.sort((a, b) => b.length - a.length);
  const picked = unique.slice(0, max);
  if (picked.length) return picked.join(" ");
  const fallback = text.trim();
  return fallback.length >= 2 ? fallback.slice(0, 40) : "";
}

let vaultModulePromise = null;
function loadVaultModule() {
  if (!vaultModulePromise) {
    vaultModulePromise = import(pathToFileURL(VAULT_LIB_PATH).href).catch((error) => {
      vaultModulePromise = null;
      throw error;
    });
  }
  return vaultModulePromise;
}

// folderOrder の順に検索し、ヒットをpathでdedupしながら limit 件まで積む。
// 05_AI対話は原本会話の全文露出を避けるため常に上限3件までに絞る。
function cascadeSearch(searchKnowledgeFn, query, folderOrder, limit = 6) {
  const collected = [];
  const seen = new Set();
  for (const folder of folderOrder) {
    if (collected.length >= limit) break;
    const cap = folder === "05_AI対話" ? Math.min(3, limit - collected.length) : limit - collected.length;
    if (cap <= 0) continue;
    let hits = [];
    try {
      hits = searchKnowledgeFn(query, cap, [folder]) || [];
    } catch {
      continue;
    }
    for (const hit of hits) {
      if (seen.has(hit.path)) continue;
      seen.add(hit.path);
      collected.push(hit);
      if (collected.length >= limit) break;
    }
  }
  return collected;
}

async function searchForMode(mode, message, { limit = 6 } = {}) {
  const modeId = resolveMode(mode);
  const cfg = MODE_CONFIG[modeId];
  const query = extractQueryKeywords(message);
  if (!query) {
    return { available: true, query: "", results: [], mode: modeId, error: null };
  }
  try {
    const vault = await loadVaultModule();
    const results = cascadeSearch(vault.searchKnowledge, query, cfg.folderOrder, limit);
    return { available: true, query, results, mode: modeId, error: null };
  } catch (error) {
    return {
      available: false,
      query,
      results: [],
      mode: modeId,
      error: error?.message || "knowledge_search_unavailable",
    };
  }
}

module.exports = {
  MODE_CONFIG,
  DEFAULT_MODE,
  DEFAULT_CASCADE,
  DEFAULT_VAULT_ROOT,
  VAULT_LIB_PATH,
  listModes,
  resolveMode,
  extractQueryKeywords,
  cascadeSearch,
  searchForMode,
};
