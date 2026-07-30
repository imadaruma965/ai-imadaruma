#!/usr/bin/env node
/**
 * Google OAuth 接続（Calendar + Sheets）
 * 使い方: node 06_科学技術省/taskboard/scripts/google-oauth-login.cjs
 *
 * 前提: 06_科学技術省/taskboard/.env.local に GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * リダイレクト: http://127.0.0.1:8765/api/gcal/callback （GOOGLE_REDIRECT_URI で変更可）
 */
const http = require("node:http");
const { URL } = require("node:url");
const { loadLocalEnv } = require("../lib/load-local-env.cjs");
const oauth = require("../google-oauth.cjs");

loadLocalEnv();

function openBrowser(url) {
  const { spawn } = require("node:child_process");
  if (process.platform === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" });
  else if (process.platform === "win32") spawn("cmd", ["/c", "start", url], { detached: true, stdio: "ignore" });
  else spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
}

async function main() {
  if (!oauth.configured()) {
    console.error(`
GOOGLE OAuth 未設定です。次を 06_科学技術省/taskboard/.env.local に追加してください:

GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxx"
GOOGLE_REDIRECT_URI="http://127.0.0.1:8765/api/gcal/callback"

Google Cloud で:
1. Google Sheets API と Google Calendar API を有効化
2. OAuth クライアント（ウェブ）のリダイレクト URI に上記を登録
詳細: 06_科学技術省/taskboard/GOOGLE_SHEETS.md
`);
    process.exit(1);
  }

  const redirect = oauth.redirectUri();
  const u = new URL(redirect);
  const port = Number(u.port || 8765);
  const pathname = u.pathname;

  const authLink = oauth.authUrl();
  console.log("ブラウザで Google 認可を開きます…");
  console.log(authLink);
  console.log(`コールバック待ち: ${redirect}`);

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        if (reqUrl.pathname !== pathname) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        const err = reqUrl.searchParams.get("error");
        if (err) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h1>認可失敗</h1><p>${err}</p>`);
          server.close();
          reject(new Error(err));
          return;
        }
        const code = reqUrl.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("missing code");
          return;
        }
        const tokens = await oauth.exchangeCode(code);
        const scopes = oauth.tokenScopes(tokens);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>Google 接続完了</h1><p>このタブを閉じてターミナルに戻ってください。</p>"
        );
        console.log("接続完了。scopes:", scopes.join(" ") || "(tokenにscope無し)");
        console.log("sheets:", oauth.hasSheetsScope(tokens) ? "OK" : "不足（再認可が必要）");
        server.close();
        resolve();
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(String(error.message || error));
        server.close();
        reject(error);
      }
    });
    server.listen(port, "127.0.0.1", () => {
      openBrowser(authLink);
    });
    server.on("error", reject);
  });
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
