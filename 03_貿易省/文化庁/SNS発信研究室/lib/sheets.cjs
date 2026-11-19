// Google Sheets 読み書き（任務盤の認証基盤を再利用。この下位フォルダはそれを書き換えない）
const path = require("node:path");
const gsheets = require("../../../産業庁/任務盤/gsheets.cjs");

async function createSpreadsheet(title) {
  const sheets = await gsheets.sheetsClient();
  const res = await sheets.spreadsheets.create({
    requestBody: { properties: { title } },
  });
  return res.data.spreadsheetId;
}

async function shareWithEmail(spreadsheetId, email) {
  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    keyFile: gsheets.serviceAccountPath(),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const drive = google.drive({ version: "v3", auth });
  await drive.permissions.create({
    fileId: spreadsheetId,
    sendNotificationEmail: false,
    requestBody: { type: "user", role: "writer", emailAddress: email },
  });
}

async function listSheetTitles(spreadsheetId) {
  const sheets = await gsheets.sheetsClient();
  const info = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  return (info.data.sheets || []).map((s) => s.properties.title);
}

async function ensureSheetsExist(spreadsheetId, titles) {
  const sheets = await gsheets.sheetsClient();
  const existing = new Set(await listSheetTitles(spreadsheetId));
  const requests = titles.filter((t) => !existing.has(t)).map((title) => ({ addSheet: { properties: { title } } }));
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

async function writeHeaderIfMissing(spreadsheetId, sheetTitle, header) {
  const existing = await gsheets.getValues(spreadsheetId, `'${sheetTitle}'!1:1`);
  if (existing.length && existing[0].length) return false;
  const sheets = await gsheets.sheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [header] },
  });
  return true;
}

async function readAllRows(spreadsheetId, sheetTitle) {
  const values = await gsheets.getValues(spreadsheetId, `'${sheetTitle}'!A2:ZZ`);
  return values.filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
}

async function appendRow(spreadsheetId, sheetTitle, row) {
  return gsheets.appendValues(spreadsheetId, `'${sheetTitle}'!A:A`, [row]);
}

async function findRowNumberByKey(spreadsheetId, sheetTitle, keyColumnIndex, keyValue) {
  const values = await gsheets.getValues(spreadsheetId, `'${sheetTitle}'!A2:ZZ`);
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][keyColumnIndex] || "") === String(keyValue)) return i + 2; // 1-indexed, +1 for header
  }
  return -1;
}

function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

async function updateRow(spreadsheetId, sheetTitle, rowNumber, row) {
  const sheets = await gsheets.sheetsClient();
  const endCol = columnLetter(row.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetTitle}'!A${rowNumber}:${endCol}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

async function setSingleSelectValidation(spreadsheetId, sheetTitle, columnIndex, values) {
  const sheets = await gsheets.sheetsClient();
  const info = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const sheetId = (info.data.sheets || []).find((s) => s.properties.title === sheetTitle)?.properties.sheetId;
  if (sheetId == null) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        setDataValidation: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
          rule: {
            condition: { type: "ONE_OF_LIST", values: values.map((v) => ({ userEnteredValue: v })) },
            showCustomUi: true,
            strict: false,
          },
        },
      }],
    },
  });
}

module.exports = {
  ...gsheets,
  createSpreadsheet,
  shareWithEmail,
  listSheetTitles,
  ensureSheetsExist,
  writeHeaderIfMissing,
  readAllRows,
  appendRow,
  findRowNumberByKey,
  updateRow,
  setSingleSelectValidation,
  columnLetter,
};
