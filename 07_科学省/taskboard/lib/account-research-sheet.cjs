/**
 * アカウントリサーチCSV → Sheets追記用の純粋ロジック
 */
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SPREADSHEET_ID = "1NzKgrJhHu_G2kQ7dXOnI9z434c3CbOhLu3j9IcFDkNo";
const DEFAULT_SHEET_TITLE = "アカウントリサーチ";
const DEFAULT_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit#gid=0`;
const COL_COUNT = 11;

/** 簡易CSVパーサ（ダブルクォート対応） */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const src = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      if (row.some((c) => String(c).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    if (row.some((c) => String(c).trim() !== "")) rows.push(row);
  }
  return rows;
}

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function usernameFromUrl(url) {
  const m = String(url || "").match(/instagram\.com\/([^/?#]+)/i);
  return m ? normalizeUsername(m[1]) : "";
}

function usernameFromRow(row) {
  const fromCol = normalizeUsername(row[3]);
  if (fromCol) return fromCol;
  return usernameFromUrl(row[4]);
}

function padRow(row) {
  const out = row.slice(0, COL_COUNT).map((c) => String(c ?? ""));
  while (out.length < COL_COUNT) out.push("");
  return out;
}

function recomputeRatio(row) {
  const out = padRow(row);
  const fol = Number(String(out[5]).replace(/,/g, ""));
  const posts = Number(String(out[6]).replace(/,/g, ""));
  if (Number.isFinite(fol) && Number.isFinite(posts) && posts > 0) {
    out[7] = String(Math.round((fol / posts) * 10000) / 10000);
  }
  return out;
}

function loadAccountResearchCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(text);
  if (!rows.length) return { header: [], data: [] };
  const header = rows[0];
  const data = rows.slice(1).map(recomputeRatio);
  return { header, data, path: path.resolve(filePath) };
}

function usernamesFromSheetValues(values) {
  const set = new Set();
  const rows = values || [];
  // 1行目は見出しとみなす
  for (const row of rows.slice(1)) {
    const u = usernameFromRow(padRow(row));
    if (u) set.add(u);
  }
  return set;
}

/**
 * @returns {{ toAppend: string[][], skipped: string[], total: number }}
 */
function filterNewRows(dataRows, existingUsernames) {
  const existing = existingUsernames instanceof Set ? existingUsernames : new Set(existingUsernames || []);
  const toAppend = [];
  const skipped = [];
  for (const row of dataRows) {
    const padded = recomputeRatio(row);
    const u = usernameFromRow(padded);
    if (!u) {
      toAppend.push(padded);
      continue;
    }
    if (existing.has(u)) {
      skipped.push(u);
      continue;
    }
    existing.add(u);
    toAppend.push(padded);
  }
  return { toAppend, skipped, total: dataRows.length };
}

module.exports = {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SHEET_TITLE,
  DEFAULT_SHEET_URL,
  COL_COUNT,
  parseCsv,
  normalizeUsername,
  usernameFromUrl,
  usernameFromRow,
  padRow,
  recomputeRatio,
  loadAccountResearchCsv,
  usernamesFromSheetValues,
  filterNewRows,
};
