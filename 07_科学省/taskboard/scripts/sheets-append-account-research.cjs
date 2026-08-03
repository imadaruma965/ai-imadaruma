#!/usr/bin/env node
/**
 * アカウントリサーチCSVを Google Sheets「アカウントリサーチ」タブへ追記（重複スキップ）
 *
 * 使い方:
 *   node 07_科学省/taskboard/scripts/sheets-append-account-research.cjs
 *   node 07_科学省/taskboard/scripts/sheets-append-account-research.cjs --csv path/to.csv --dry-run
 */
const path = require("node:path");
const { loadLocalEnv } = require("../lib/load-local-env.cjs");
const gsheets = require("../gsheets.cjs");
const {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SHEET_TITLE,
  loadAccountResearchCsv,
  usernamesFromSheetValues,
  filterNewRows,
} = require("../lib/account-research-sheet.cjs");

loadLocalEnv();

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const spreadsheetId =
    argValue("--id") || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
  const sheetTitle = argValue("--sheet") || process.env.GOOGLE_SHEETS_ACCOUNT_TAB || DEFAULT_SHEET_TITLE;
  const csvPath =
    argValue("--csv") ||
    path.join(
      __dirname,
      "../../../08_情報省/ダヴィンチ図書館/02_国家事業/Instagram/01_リサーチ原本/instagram_account_research_30_2026-07-29.csv"
    );

  const st = await gsheets.status();
  if (!st.configured || !st.connected || !st.sheets) {
    console.error(
      "Sheets 未接続です。サービスアカウント JSON を 07_科学省/taskboard/secrets/google-sheets-service-account.json に置くか、OAuth 認可してください（GOOGLE_SHEETS.md）。"
    );
    process.exit(1);
  }
  console.log(`認証: ${st.authMode}`);

  const { data, path: resolved } = loadAccountResearchCsv(csvPath);
  console.log(`CSV: ${resolved} (${data.length} 行)`);

  const range = `${sheetTitle}!A:M`;
  const existingValues = await gsheets.getValues(spreadsheetId, range);
  const existing = usernamesFromSheetValues(existingValues);
  console.log(`シート既存: ${existing.size} アカウント`);

  const { toAppend, skipped } = filterNewRows(data, existing);
  console.log(`スキップ(重複): ${skipped.length}`);
  if (skipped.length) console.log("  ", skipped.join(", "));
  console.log(`追記候補: ${toAppend.length}`);

  if (!toAppend.length) {
    console.log("追記なし。終了。");
    return;
  }

  // append API は数式行を「使用中」とみなし遠くに書くことがあるため、A列の次空き行へ update
  let nextRow = 2;
  for (let i = 0; i < existingValues.length; i += 1) {
    const a = existingValues[i]?.[0];
    if (String(a || "").trim()) nextRow = i + 2;
  }
  const endRow = nextRow + toAppend.length - 1;
  const writeRange = `${sheetTitle}!A${nextRow}:M${endRow}`;
  console.log(`書込先: ${writeRange}`);

  if (dryRun) {
    console.log("[dry-run] 先頭3件:", toAppend.slice(0, 3).map((r) => r[3]));
    return;
  }

  const sheets = await gsheets.sheetsClient();
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: writeRange,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: toAppend },
  });
  console.log(
    `追記完了: ${toAppend.length} 行 → ${res.data.updatedRange || writeRange}`
  );
}

main().catch((error) => {
  console.error("失敗:", error.code || "", error.message || error);
  if (error.code === 403 || /insufficient|PERMISSION|access/i.test(String(error.message))) {
    console.error(
      "ヒント: Sheets API 有効化、またはシートをサービスアカウント(client_email)と編集者共有してください。"
    );
  }
  process.exit(1);
});
