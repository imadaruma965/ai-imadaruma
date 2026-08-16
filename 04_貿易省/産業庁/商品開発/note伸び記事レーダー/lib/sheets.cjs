const path = require("node:path");
const { google } = require("googleapis");

const DEFAULT_SERVICE_ACCOUNT = path.resolve(
  __dirname,
  "../../../taskboard/secrets/google-sheets-service-account.json"
);

async function client(serviceAccountPath = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON || DEFAULT_SERVICE_ACCOUNT) {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureSheets(sheets, spreadsheetId, titles) {
  const info = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const existing = new Set((info.data.sheets || []).map((sheet) => sheet.properties.title));
  const requests = titles.filter((title) => !existing.has(title)).map((title) => ({ addSheet: { properties: { title } } }));
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

function rowsForArticles(articles, observedAt) {
  const header = [
    "観測日時", "順位", "伸びスコア", "記事タイトル", "記事URL", "著者", "著者URL", "公開日時",
    "公開後時間", "スキ数", "スキ増加", "スキ/日", "フォロワー数", "フォロワー増加", "スキ÷フォロワー",
    "テーマ", "タイトル型", "対象読者", "数字あり", "括弧あり", "タイトル文字数", "有料価格", "発見元",
  ];
  const rows = articles.map((article, index) => [
    observedAt, index + 1, Number(article.score.toFixed(2)), article.title, article.url, article.author,
    article.authorUrl, article.publishedAt, Number(article.ageHours.toFixed(1)), article.likes,
    article.likeDelta ?? "初回", Number(article.likesPerDay.toFixed(2)), article.followers ?? "取得不能",
    article.followerDelta ?? "初回", article.engagement === null ? "" : Number(article.engagement.toFixed(4)),
    article.analysis.themes, article.analysis.hook, article.analysis.audience,
    article.analysis.hasNumber ? "○" : "", article.analysis.hasBracket ? "○" : "", article.analysis.titleLength,
    article.price || 0, article.source,
  ]);
  return { header, rows };
}

async function writeResults({ spreadsheetId, currentSheet, historySheet, articles, observedAt, serviceAccountPath }) {
  const sheets = await client(serviceAccountPath || undefined);
  await ensureSheets(sheets, spreadsheetId, [currentSheet, historySheet]);
  const { header, rows } = rowsForArticles(articles, observedAt);
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `'${currentSheet}'!A:W`, requestBody: {} });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${currentSheet}'!A1:W${rows.length + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [header, ...rows] },
  });
  const historyValues = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${historySheet}'!A1:W2` });
  const historyRows = historyValues.data.values?.length ? rows : [header, ...rows];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${historySheet}'!A:W`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: historyRows },
  });
  return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, rowCount: rows.length };
}

module.exports = { DEFAULT_SERVICE_ACCOUNT, ensureSheets, rowsForArticles, writeResults };
