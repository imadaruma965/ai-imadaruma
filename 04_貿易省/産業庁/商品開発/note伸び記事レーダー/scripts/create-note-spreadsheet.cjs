#!/usr/bin/env node
const path = require("node:path");
const { google } = require("googleapis");

const SOURCE_ID = process.env.NOTE_RADAR_SOURCE_SPREADSHEET_ID || "1NzKgrJhHu_G2kQ7dXOnI9z434c3CbOhLu3j9IcFDkNo";
const SHARE_EMAIL = process.env.NOTE_RADAR_SHARE_EMAIL || "ptrd965@gmail.com";
const TITLES = ["note最新TOP50", "note観測履歴"];
const SERVICE_ACCOUNT =
  process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON ||
  path.resolve(__dirname, "../../../taskboard/secrets/google-sheets-service-account.json");

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });
  const targetArgIndex = process.argv.indexOf("--target-id");
  const suppliedTargetId = targetArgIndex >= 0 ? process.argv[targetArgIndex + 1] : null;

  const sourceValues = {};
  for (const title of TITLES) {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SOURCE_ID,
      range: `'${title}'!A:W`,
    });
    sourceValues[title] = result.data.values || [];
    if (sourceValues[title].length < 2) throw new Error(`${title} にデータがありません`);
  }

  let targetId = suppliedTargetId;
  if (targetId) {
    const target = await sheets.spreadsheets.get({ spreadsheetId: targetId, fields: "sheets.properties" });
    const existingTitles = new Set((target.data.sheets || []).map((sheet) => sheet.properties.title));
    const missing = TITLES.filter((title) => !existingTitles.has(title));
    if (missing.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: targetId,
        requestBody: {
          requests: missing.map((title) => ({
            addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
          })),
        },
      });
    }
  } else {
    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: "note伸び記事分析" },
        sheets: TITLES.map((title) => ({
          properties: { title, gridProperties: { frozenRowCount: 1 } },
        })),
      },
    });
    targetId = created.data.spreadsheetId;
    if (!targetId) throw new Error("新しいスプレッドシートIDを取得できませんでした");
  }

  try {
    for (const title of TITLES) {
      const values = sourceValues[title];
      await sheets.spreadsheets.values.update({
        spreadsheetId: targetId,
        range: `'${title}'!A1:W${values.length}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
    }

    if (!suppliedTargetId) {
      await drive.permissions.create({
        fileId: targetId,
        sendNotificationEmail: true,
        requestBody: { type: "user", role: "writer", emailAddress: SHARE_EMAIL },
      });
    }

    for (const title of TITLES) {
      const verify = await sheets.spreadsheets.values.get({
        spreadsheetId: targetId,
        range: `'${title}'!A:W`,
      });
      const copiedRows = verify.data.values?.length || 0;
      if (copiedRows !== sourceValues[title].length) {
        throw new Error(`${title} のコピー行数不一致: ${sourceValues[title].length} → ${copiedRows}`);
      }
    }

    if (suppliedTargetId) {
      const target = await sheets.spreadsheets.get({ spreadsheetId: targetId, fields: "sheets.properties" });
      const disposable = [];
      for (const sheet of target.data.sheets || []) {
        if (TITLES.includes(sheet.properties.title)) continue;
        const probe = await sheets.spreadsheets.values.get({
          spreadsheetId: targetId,
          range: `'${sheet.properties.title}'!A1:Z10`,
        });
        if (!(probe.data.values || []).length) disposable.push(sheet.properties.sheetId);
      }
      if (disposable.length) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: targetId,
          requestBody: { requests: disposable.map((sheetId) => ({ deleteSheet: { sheetId } })) },
        });
      }
    }

    if (process.argv.includes("--delete-source-tabs")) {
      const source = await sheets.spreadsheets.get({ spreadsheetId: SOURCE_ID, fields: "sheets.properties" });
      const ids = (source.data.sheets || [])
        .filter((sheet) => TITLES.includes(sheet.properties.title))
        .map((sheet) => sheet.properties.sheetId);
      if (ids.length !== TITLES.length) throw new Error("元シートの削除対象2タブを特定できませんでした");
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SOURCE_ID,
        requestBody: { requests: ids.map((sheetId) => ({ deleteSheet: { sheetId } })) },
      });
    }

    console.log(JSON.stringify({
      spreadsheetId: targetId,
      url: `https://docs.google.com/spreadsheets/d/${targetId}/edit`,
      sharedWith: SHARE_EMAIL,
      rows: Object.fromEntries(TITLES.map((title) => [title, sourceValues[title].length])),
      sourceTabsDeleted: process.argv.includes("--delete-source-tabs"),
    }));
  } catch (error) {
    console.error(`移行失敗。新規ファイルID: ${targetId}`);
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
