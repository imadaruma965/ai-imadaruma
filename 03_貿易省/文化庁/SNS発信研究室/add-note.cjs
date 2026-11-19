#!/usr/bin/env node
// note記事を1件記録／更新する（記事URLが一意キー）。
// 使い方: node add-note.cjs --title "..." --url ... --published 2026-11-19 --genre 信頼 \
//   --access 有料 --price 500 --impressions 0 --pv 0 --likes 0 --comments 0 \
//   --referrer "" --sales 0 --revenue 0 --funnel ""
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
  const url = option("--url");
  if (!url) throw new Error("--url は必須（重複チェックの一意キー）");

  const record = {
    "記事タイトル": option("--title", ""),
    "記事URL": url,
    "公開日": option("--published", ""),
    "更新日": option("--updated", ""),
    "ジャンル": option("--genre", ""),
    "無料・有料区分": option("--access", ""),
    "販売価格": option("--price", ""),
    "インプレッション": option("--impressions", ""),
    "PV": option("--pv", ""),
    "スキ": option("--likes", ""),
    "コメント": option("--comments", ""),
    "流入元": option("--referrer", ""),
    "販売数": option("--sales", ""),
    "売上": option("--revenue", ""),
    "購入導線": option("--funnel", ""),
  };
  if (!record["公開日"]) throw new Error("--published は必須（YYYY-MM-DD）");

  const row = core.noteRowFromRecord(record);
  const keyIndex = core.NOTE_COLUMNS.indexOf("記事URL");
  const existingRow = await sheets.findRowNumberByKey(config.spreadsheetId, config.sheets.note, keyIndex, url);
  if (existingRow > 0) {
    await sheets.updateRow(config.spreadsheetId, config.sheets.note, existingRow, row);
    console.log(`更新しました(行${existingRow}): ${url}`);
  } else {
    await sheets.appendRow(config.spreadsheetId, config.sheets.note, row);
    console.log(`記録しました: ${url}`);
  }
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
