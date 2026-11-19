#!/usr/bin/env node
// 初回セットアップ／再実行可：スプレッドシート作成・タブ・ヘッダー・プルダウンを整える。
// 既存データ行は一切変更しない（ヘッダー欠落時のみ書き込み、データ検証の再設定のみ行う）。
const fs = require("node:fs");
const path = require("node:path");
const sheets = require("./lib/sheets.cjs");
const core = require("./lib/core.cjs");

const CONFIG_PATH = path.join(__dirname, "config.json");

function option(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function main() {
  const config = loadConfig();
  const shareEmail = option("--share-email", null);

  if (!config.spreadsheetId) {
    console.log("スプレッドシートIDが未設定。新規作成します。");
    config.spreadsheetId = await sheets.createSpreadsheet("烏龍式・SNS発信研究室");
    saveConfig(config);
    console.log(`作成しました: https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`);
  } else {
    console.log(`既存スプレッドシートを使用: ${config.spreadsheetId}`);
  }

  if (shareEmail) {
    await sheets.shareWithEmail(config.spreadsheetId, shareEmail);
    console.log(`編集権限を共有しました: ${shareEmail}`);
  }

  const tabTitles = [config.sheets.x, config.sheets.note, config.sheets.hypothesis, "分類マスタ"];
  await sheets.ensureSheetsExist(config.spreadsheetId, tabTitles);

  await sheets.writeHeaderIfMissing(config.spreadsheetId, config.sheets.x, core.X_COLUMNS);
  await sheets.writeHeaderIfMissing(config.spreadsheetId, config.sheets.note, core.NOTE_COLUMNS);
  await sheets.writeHeaderIfMissing(config.spreadsheetId, config.sheets.hypothesis, core.HYPOTHESIS_COLUMNS);

  const masterRows = Object.entries(config.classifications).map(([key, values]) => [key, ...values]);
  const existingMaster = await sheets.getValues(config.spreadsheetId, `'分類マスタ'!A1`);
  if (!existingMaster.length) {
    const sheetsClient = await sheets.sheetsClient();
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: "'分類マスタ'!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["分類項目", "選択肢（複数選択は「；」で区切って入力）"], ...masterRows] },
    });
  }

  const singleSelect = {
    投稿形式: config.classifications.format,
    フックの種類: config.classifications.hookType,
    投稿の目的: config.classifications.purpose,
  };
  for (const [col, values] of Object.entries(singleSelect)) {
    const idx = core.X_COLUMNS.indexOf(col);
    if (idx >= 0) await sheets.setSingleSelectValidation(config.spreadsheetId, config.sheets.x, idx, values);
  }
  const noteSingleSelect = { "ジャンル": config.classifications.noteGenre, "無料・有料区分": config.classifications.noteAccessType };
  for (const [col, values] of Object.entries(noteSingleSelect)) {
    const idx = core.NOTE_COLUMNS.indexOf(col);
    if (idx >= 0) await sheets.setSingleSelectValidation(config.spreadsheetId, config.sheets.note, idx, values);
  }

  console.log("セットアップ完了。");
  console.log(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`);
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
