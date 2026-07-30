/**
 * Google Sheets 読み書き
 * 優先: サービスアカウント JSON → なければ OAuth (google-oauth.cjs)
 */
const fs = require("node:fs");
const path = require("node:path");
const { google } = require("googleapis");
const oauth = require("./google-oauth.cjs");

const DEFAULT_SA_PATH = path.join(__dirname, "secrets", "google-sheets-service-account.json");
const SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function serviceAccountPath() {
  return process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || DEFAULT_SA_PATH;
}

function hasServiceAccount() {
  try {
    return fs.existsSync(serviceAccountPath());
  } catch {
    return false;
  }
}

async function getAuth() {
  if (hasServiceAccount()) {
    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath(),
      scopes: SHEETS_SCOPES,
    });
    return auth;
  }
  return oauth.getAuthedClient();
}

async function sheetsClient() {
  const auth = await getAuth();
  return google.sheets({ version: "v4", auth });
}

async function getValues(spreadsheetId, range) {
  const sheets = await sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return res.data.values || [];
}

async function appendValues(spreadsheetId, range, rows, { valueInputOption = "USER_ENTERED" } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { updatedRows: 0, updates: null };
  }
  const sheets = await sheetsClient();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption,
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
  return {
    updatedRows: res.data.updates?.updatedRows || rows.length,
    updatedRange: res.data.updates?.updatedRange || null,
    updates: res.data.updates || null,
  };
}

async function status() {
  if (hasServiceAccount()) {
    return {
      configured: true,
      connected: true,
      authMode: "service_account",
      sheets: true,
      serviceAccountPath: serviceAccountPath(),
    };
  }
  const base = await oauth.status();
  return { ...base, authMode: "oauth" };
}

module.exports = {
  getValues,
  appendValues,
  status,
  sheetsClient,
  hasServiceAccount,
  serviceAccountPath,
};
