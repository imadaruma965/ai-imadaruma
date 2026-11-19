#!/usr/bin/env node
// X投稿を1件記録する。メトリクス(24h/72h)は未入力でよい（後で update-x.cjs で記入）。
// 使い方: node add-x.cjs --url ... --date 2026-11-19 --time 09:00 --hook "..." --text "..." \
//   --genre "行動；お金" --theme "..." --loss "時間的損失" --format 箇条書き \
//   --hook-type 具体的な数字 --lens "心理学；実体験" --experience ○ --image ○ --link × --purpose 送客
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

  const existingRow = await sheets.findRowNumberByKey(config.spreadsheetId, config.sheets.x, core.X_COLUMNS.indexOf("投稿URL"), url);
  if (existingRow > 0 && !process.argv.includes("--force")) {
    throw new Error(`既に記録済み(行${existingRow})。上書きする場合は --force を付けてください`);
  }

  const record = {
    "投稿日": option("--date"),
    "投稿時刻": option("--time"),
    "投稿URL": url,
    "冒頭3行のフック": option("--hook", ""),
    "投稿全文": option("--text", ""),
    "発信ジャンル": core.splitMulti(option("--genre", "")),
    "投稿テーマ": option("--theme", ""),
    "損失の種類": core.splitMulti(option("--loss", "")),
    "投稿形式": option("--format", ""),
    "フックの種類": option("--hook-type", ""),
    "複眼設計の種類": core.splitMulti(option("--lens", "")),
    "実体験の有無": option("--experience", ""),
    "画像の有無": option("--image", ""),
    "外部リンクの有無": option("--link", ""),
    "投稿の目的": option("--purpose", ""),
  };
  if (!record["投稿日"]) throw new Error("--date は必須（YYYY-MM-DD）");

  const row = core.xRowFromRecord(record);
  if (existingRow > 0) {
    await sheets.updateRow(config.spreadsheetId, config.sheets.x, existingRow, row);
    console.log(`更新しました(行${existingRow}): ${url}`);
  } else {
    await sheets.appendRow(config.spreadsheetId, config.sheets.x, row);
    console.log(`記録しました: ${url}`);
  }
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
