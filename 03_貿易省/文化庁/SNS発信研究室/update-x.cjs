#!/usr/bin/env node
// 既存のX投稿記録に24h/72hのメトリクスを書き込む（該当列だけ更新。他列は既存値を保持）。
// 使い方: node update-x.cjs --url ... --window 24h --impressions 1200 --likes 80 --reposts 10 \
//   --replies 5 --bookmarks 20 --detail-clicks 30 --profile-access 15 --follows 3 --link-clicks 4
const fs = require("node:fs");
const path = require("node:path");
const sheets = require("./lib/sheets.cjs");
const core = require("./lib/core.cjs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

function option(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

const METRIC_FLAGS = {
  "インプレッション": "--impressions",
  "いいね": "--likes",
  "リポスト": "--reposts",
  "リプライ": "--replies",
  "ブックマーク": "--bookmarks",
  "詳細クリック": "--detail-clicks",
  "プロフィールアクセス": "--profile-access",
  "フォロー獲得数": "--follows",
  "リンククリック": "--link-clicks",
};

async function main() {
  if (!config.spreadsheetId) throw new Error("先に setup-sheet.cjs を実行してください（spreadsheetId未設定）");
  const url = option("--url");
  const window = option("--window");
  if (!url || !core.X_WINDOWS.includes(window)) {
    throw new Error(`--url と --window(${core.X_WINDOWS.join("/")}) は必須`);
  }

  const keyIndex = core.X_COLUMNS.indexOf("投稿URL");
  const rowNumber = await sheets.findRowNumberByKey(config.spreadsheetId, config.sheets.x, keyIndex, url);
  if (rowNumber < 0) throw new Error(`該当する投稿URLが見つからない。先に add-x.cjs で記録してください: ${url}`);

  const existingRows = await sheets.getValues(config.spreadsheetId, `'${config.sheets.x}'!A${rowNumber}:ZZ${rowNumber}`);
  const row = existingRows[0] || [];
  Object.entries(METRIC_FLAGS).forEach(([metric, flag]) => {
    const value = option(flag, null);
    if (value == null) return;
    const colIndex = core.X_COLUMNS.indexOf(`${metric}_${window}`);
    row[colIndex] = value;
  });

  await sheets.updateRow(config.spreadsheetId, config.sheets.x, rowNumber, row);
  console.log(`${window}メトリクスを更新しました(行${rowNumber}): ${url}`);
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
