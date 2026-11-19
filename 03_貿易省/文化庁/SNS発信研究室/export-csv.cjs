#!/usr/bin/env node
// スプレッドシートの全タブをCSVへ書き出す（バックアップ・他ツールでの分析用）。
// 使い方: node export-csv.cjs [--out data/export]
const fs = require("node:fs");
const path = require("node:path");
const sheets = require("./lib/sheets.cjs");
const csv = require("./lib/csv.cjs");
const core = require("./lib/core.cjs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

function option(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

async function exportTab(sheetTitle, header, outPath) {
  const rows = await sheets.readAllRows(config.spreadsheetId, sheetTitle);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, csv.toCSV([header, ...rows]), "utf8");
  console.log(`書き出し: ${outPath} (${rows.length}行)`);
}

async function main() {
  if (!config.spreadsheetId) throw new Error("先に setup-sheet.cjs を実行してください（spreadsheetId未設定）");
  const outDir = path.resolve(option("--out", path.join(__dirname, "data", "export")));
  await exportTab(config.sheets.x, core.X_COLUMNS, path.join(outDir, "x投稿ログ.csv"));
  await exportTab(config.sheets.note, core.NOTE_COLUMNS, path.join(outDir, "note記事ログ.csv"));
  await exportTab(config.sheets.hypothesis, core.HYPOTHESIS_COLUMNS, path.join(outDir, "仮説ログ.csv"));
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
