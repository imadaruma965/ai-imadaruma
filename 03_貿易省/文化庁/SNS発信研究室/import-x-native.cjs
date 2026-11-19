#!/usr/bin/env node
// X公式アナリティクスの「投稿ごと」CSVエクスポート（ポストID,日付,ポスト本文,ポストのリンク,
// インプレッション数,いいね,エンゲージメント,ブックマーク,共有された回数,新しいフォロー,返信,
// リポスト,プロフィールへのアクセス数,詳細のクリック数,URLのクリック数,ハッシュタグのクリック数,
// パーマリンクのクリック数）を読み込み、X投稿ログへ一括取り込みする。
//
// 重要な注意（実測と区別するために必ず説明する）:
// - このCSVは「エクスポート時点までの累計値」であり、投稿後ちょうど24時間／72時間の値ではない。
//   24時間値は取得できないため空欄（欠損値）、72時間値の列には「エクスポート時点の累計」を
//   近似値として入れる（投稿から72時間以上経過している投稿がほとんどのため、実務上は妥当だが、
//   厳密な72時間後の値ではないことに注意）。
// - 発信ジャンル・損失の種類・投稿形式・フックの種類・複眼設計・実体験/画像/外部リンクの有無・
//   投稿の目的は、このCSVに含まれないため空欄のまま取り込む（BOSSの分類判断が必要で、
//   架空の値を入れない）。後からスプレッドシート上で直接埋められる。
//
// 使い方: node import-x-native.cjs --csv path/to/account_analytics_content_*.csv [--dry-run]
const fs = require("node:fs");
const path = require("node:path");
const sheets = require("./lib/sheets.cjs");
const csvLib = require("./lib/csv.cjs");
const core = require("./lib/core.cjs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

function option(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

const NATIVE_HEADER = [
  "ポストID", "日付", "ポスト本文", "ポストのリンク", "インプレッション数", "いいね", "エンゲージメント",
  "ブックマーク", "共有された回数", "新しいフォロー", "返信", "リポスト", "プロフィールへのアクセス数",
  "詳細のクリック数", "URLのクリック数", "ハッシュタグのクリック数", "パーマリンクのクリック数",
];

function nativeRowToXRecord(row) {
  const get = (name) => row[NATIVE_HEADER.indexOf(name)];
  const url = get("ポストのリンク");
  const text = get("ポスト本文");
  const date = core.parseXExportDate(get("日付"));
  const record = {
    "投稿日": date,
    "投稿時刻": "",
    "投稿URL": url,
    "冒頭3行のフック": core.deriveHook(text),
    "投稿全文": text,
    "発信ジャンル": [],
    "投稿テーマ": "",
    "損失の種類": [],
    "投稿形式": "",
    "フックの種類": "",
    "複眼設計の種類": [],
    "実体験の有無": "",
    "画像の有無": "",
    "外部リンクの有無": "",
    "投稿の目的": "",
    "インプレッション_24h": "",
    "いいね_24h": "",
    "リポスト_24h": "",
    "リプライ_24h": "",
    "ブックマーク_24h": "",
    "詳細クリック_24h": "",
    "プロフィールアクセス_24h": "",
    "フォロー獲得数_24h": "",
    "リンククリック_24h": "",
    "インプレッション_72h": get("インプレッション数"),
    "いいね_72h": get("いいね"),
    "リポスト_72h": get("リポスト"),
    "リプライ_72h": get("返信"),
    "ブックマーク_72h": get("ブックマーク"),
    "詳細クリック_72h": get("詳細のクリック数"),
    "プロフィールアクセス_72h": get("プロフィールへのアクセス数"),
    "フォロー獲得数_72h": get("新しいフォロー"),
    "リンククリック_72h": get("URLのクリック数"),
  };
  return { url, date, record };
}

async function main() {
  if (!config.spreadsheetId) throw new Error("先に setup-sheet.cjs を実行してください（spreadsheetId未設定）");
  const csvPath = option("--csv");
  if (!csvPath) throw new Error("--csv は必須");
  const dryRun = process.argv.includes("--dry-run");

  const text = fs.readFileSync(path.resolve(csvPath), "utf8");
  const [header, ...dataRows] = csvLib.parseCSV(text);
  if (JSON.stringify(header) !== JSON.stringify(NATIVE_HEADER)) {
    console.error("警告: X公式エクスポートの列構成（投稿ごと）と一致しない。想定外のファイルの可能性があります。");
    console.error(`期待: ${NATIVE_HEADER.join(",")}`);
    console.error(`実際: ${header.join(",")}`);
  }

  const keyIndex = core.X_COLUMNS.indexOf("投稿URL");
  const existingRows = dryRun ? [] : await sheets.readAllRows(config.spreadsheetId, config.sheets.x);
  const existingByUrl = new Map(existingRows.map((row, i) => [row[keyIndex], i + 2]));

  const appends = [];
  const updates = [];
  let skippedNoUrl = 0;
  let skippedNoDate = 0;

  for (const row of dataRows) {
    const { url, date, record } = nativeRowToXRecord(row);
    if (!url) { skippedNoUrl++; continue; }
    if (!date) { skippedNoDate++; continue; }
    const sheetRow = core.xRowFromRecord(record);
    const rowNumber = existingByUrl.get(url);
    if (rowNumber) updates.push({ rowNumber, row: sheetRow });
    else appends.push(sheetRow);
  }

  console.log(`読み込み: ${dataRows.length}行 / 追加予定: ${appends.length} / 更新予定: ${updates.length} / URL欠落でスキップ: ${skippedNoUrl} / 日付不明でスキップ: ${skippedNoDate}`);

  if (dryRun) {
    console.log("--dry-run のため書き込みは行いません。");
    return;
  }

  if (updates.length) await sheets.batchUpdateRows(config.spreadsheetId, config.sheets.x, updates);
  if (appends.length) await sheets.appendRows(config.spreadsheetId, config.sheets.x, appends);

  console.log(`完了: 追加${appends.length}件 / 更新${updates.length}件`);
  console.log("注意: 24h値は取得できないため空欄、72h値は「エクスポート時点の累計」を近似値として記録しました。");
  console.log("発信ジャンル等の分類は未入力のままです。スプレッドシート上で埋めてください。");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("失敗:", error.message || error);
    process.exit(1);
  });
}

module.exports = { NATIVE_HEADER, nativeRowToXRecord };
