#!/usr/bin/env node
// 仮説・検証結果・次回の改善案を1件追記する（追記のみ、重複チェックなし）。
// 使い方: node add-hypothesis.cjs --date 2026-11-19 --target "X投稿URL or note URL or 全般" \
//   --hypothesis "..." --method "..." --result "..." --next "..."
const fs = require("node:fs");
const path = require("node:path");
const sheets = require("./lib/sheets.cjs");
const core = require("./lib/core.cjs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

function option(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

async function main() {
  if (!config.spreadsheetId) throw new Error("先に setup-sheet.cjs を実行してください（spreadsheetId未設定）");
  const date = option("--date");
  if (!date) throw new Error("--date は必須（YYYY-MM-DD）");
  const row = [date, option("--target", ""), option("--hypothesis", ""), option("--method", ""), option("--result", ""), option("--next", "")];
  await sheets.appendRow(config.spreadsheetId, config.sheets.hypothesis, row);
  console.log("仮説ログに記録しました。");
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
