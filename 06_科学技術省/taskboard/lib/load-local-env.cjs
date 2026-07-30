/**
 * 06_科学技術省/taskboard/.env.local を起動 cwd に依存せず読み込む。
 * 既存の process.env は上書きしない（空文字のみファイル値で埋める）。
 * 秘密値はログに出さないこと。
 */
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ENV_FILE = path.join(__dirname, "..", ".env.local");

function stripQuotes(value) {
  const v = String(value ?? "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * @param {{ envFile?: string, env?: NodeJS.ProcessEnv }} [options]
 * @returns {{ loaded: boolean, path: string, appliedKeys: string[] }}
 */
function loadLocalEnv(options = {}) {
  const envFile = options.envFile || DEFAULT_ENV_FILE;
  const env = options.env || process.env;
  const appliedKeys = [];

  if (!fs.existsSync(envFile)) {
    return { loaded: false, path: envFile, appliedKeys };
  }

  let text = "";
  try {
    text = fs.readFileSync(envFile, "utf8");
  } catch {
    return { loaded: false, path: envFile, appliedKeys };
  }

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) return;
    const key = m[1];
    const value = stripQuotes(m[2]);
    const current = env[key];
    if (current == null || current === "") {
      env[key] = value;
      appliedKeys.push(key);
    }
  });

  return { loaded: true, path: envFile, appliedKeys };
}

function hasCursorApiKey(env = process.env) {
  return Boolean(String(env.CURSOR_API_KEY || "").trim());
}

/** @returns {string|undefined} trimmed key; never log this value */
function getCursorApiKey(env = process.env) {
  const key = String(env.CURSOR_API_KEY || "").trim();
  return key || undefined;
}

module.exports = {
  DEFAULT_ENV_FILE,
  loadLocalEnv,
  hasCursorApiKey,
  getCursorApiKey,
  stripQuotes,
};
