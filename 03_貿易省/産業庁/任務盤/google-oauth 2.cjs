/**
 * Google OAuth（Calendar + Sheets 共通）
 * トークン: data/google-token.json（旧 gcal-token.json からも移行読込）
 */
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const path = require("node:path");
const { google } = require("googleapis");

const DATA_DIR = path.join(__dirname, "data");
const TOKEN_FILE = path.join(DATA_DIR, "google-token.json");
const LEGACY_TOKEN_FILE = path.join(DATA_DIR, "gcal-token.json");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets",
];

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `http://127.0.0.1:${process.env.GYOMU_TOCHI_PORT || 8765}/api/gcal/callback`
  );
}

function createOAuthClient() {
  if (!configured()) {
    const err = new Error("google_oauth_not_configured");
    err.code = "google_oauth_not_configured";
    throw err;
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri()
  );
}

async function readToken() {
  for (const file of [TOKEN_FILE, LEGACY_TOKEN_FILE]) {
    try {
      return JSON.parse(await fsp.readFile(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function writeToken(tokens) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(TOKEN_FILE, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
  // 旧ファイルが残っていれば新ファイルへ寄せたあと削除しない（安全のため残す）
}

function tokenScopes(token) {
  if (!token?.scope) return [];
  return String(token.scope)
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasSheetsScope(token) {
  return tokenScopes(token).some((s) => s.includes("spreadsheets"));
}

function hasCalendarScope(token) {
  const scopes = tokenScopes(token);
  return scopes.some((s) => s.includes("calendar"));
}

async function getAuthedClient() {
  const client = createOAuthClient();
  const token = await readToken();
  if (!token?.refresh_token && !token?.access_token) {
    const err = new Error("google_not_connected");
    err.code = "google_not_connected";
    throw err;
  }
  client.setCredentials(token);
  client.on("tokens", async (fresh) => {
    const merged = { ...token, ...fresh };
    await writeToken(merged);
  });
  return client;
}

function authUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

async function exchangeCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  await writeToken(tokens);
  return tokens;
}

async function status() {
  const conf = configured();
  if (!conf) {
    return {
      configured: false,
      connected: false,
      redirectUri: redirectUri(),
      scopes: SCOPES,
      sheets: false,
      calendar: false,
    };
  }
  const token = await readToken();
  const connected = Boolean(token?.refresh_token || token?.access_token);
  return {
    configured: true,
    connected,
    redirectUri: redirectUri(),
    scopes: SCOPES,
    sheets: connected && (token?.scope ? hasSheetsScope(token) : false),
    calendar: connected && (token?.scope ? hasCalendarScope(token) : connected),
    tokenFile: fs.existsSync(TOKEN_FILE)
      ? "google-token.json"
      : fs.existsSync(LEGACY_TOKEN_FILE)
        ? "gcal-token.json"
        : null,
  };
}

module.exports = {
  SCOPES,
  TOKEN_FILE,
  LEGACY_TOKEN_FILE,
  configured,
  redirectUri,
  createOAuthClient,
  readToken,
  writeToken,
  getAuthedClient,
  authUrl,
  exchangeCode,
  status,
  tokenScopes,
  hasSheetsScope,
  hasCalendarScope,
};
