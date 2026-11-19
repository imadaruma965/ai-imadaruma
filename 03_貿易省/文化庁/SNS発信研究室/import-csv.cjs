#!/usr/bin/env node
// CSVを読み込み、X投稿ログ／note記事ログへ一意キー（投稿URL／記事URL）で追記・更新する。
// 使い方: node import-csv.cjs --type x --csv path/to.csv [--dry-run]
//        node import-csv.cjs --type note --csv path/to.csv [--dry-run]
// CSVの1行目はヘッダー。core.X_COLUMNS / core.NOTE_COLUMNS と同じ列名・順序を想定する
// （export-csv.cjs の出力をそのまま編集して再取込みする運用を想定）。
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

async function main() {
  if (!config.spreadsheetId) throw new Error("先に setup-sheet.cjs を実行してください（spreadsheetId未設定）");
  const type = option("--type");
  const csvPath = option("--csv");
  if (!["x", "note"].includes(type) || !csvPath) throw new Error("--type (x|note) と --csv は必須");
  const dryRun = process.argv.includes("--dry-run");

  const sheetTitle = type === "x" ? config.sheets.x : config.sheets.note;
  const columns = type === "x" ? core.X_COLUMNS : core.NOTE_COLUMNS;
  const keyColumn = type === "x" ? "投稿URL" : "記事URL";
  const keyIndex = columns.indexOf(keyColumn);

  const text = fs.readFileSync(path.resolve(csvPath), "utf8");
  const [header, ...dataRows] = csv.parseCSV(text);
  if (JSON.stringify(header) !== JSON.stringify(columns)) {
    console.error(`警告: CSVの列構成が想定(${columns.length}列)と一致しない。export-csv.cjsの出力形式を確認してください。`);
  }

  let added = 0;
  let updated = 0;
  for (const row of dataRows) {
    const key = row[keyIndex];
    if (!key) continue;
    const rowNumber = await sheets.findRowNumberByKey(config.spreadsheetId, sheetTitle, keyIndex, key);
    if (dryRun) {
      console.log(rowNumber > 0 ? `更新予定(行${rowNumber}): ${key}` : `追加予定: ${key}`);
      continue;
    }
    if (rowNumber > 0) {
      await sheets.updateRow(config.spreadsheetId, sheetTitle, rowNumber, row);
      updated++;
    } else {
      await sheets.appendRow(config.spreadsheetId, sheetTitle, row);
      added++;
    }
  }
  if (!dryRun) console.log(`完了: 追加${added}件 / 更新${updated}件`);
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
