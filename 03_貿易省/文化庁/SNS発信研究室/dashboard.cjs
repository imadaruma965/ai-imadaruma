#!/usr/bin/env node
// スプレッドシートの実測データからダッシュボード(静的HTML)を生成する。
// 外部CDNに依存しない(オフラインでも閲覧可)。推測と実測を区別し、サンプルが少ない集計には注意書きを出す。
// 使い方: node dashboard.cjs [--out dashboard/index.html]
const fs = require("node:fs");
const path = require("node:path");
const sheets = require("./lib/sheets.cjs");
const core = require("./lib/core.cjs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

function option(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] || fallback;
}

function pct(v) {
  return v == null ? "—" : `${(v * 100).toFixed(2)}%`;
}

function num(v, digits = 1) {
  return v == null ? "—" : Number(v).toFixed(digits);
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function barRow(label, value, max, formatter) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `<div class="bar-row"><span class="bar-label">${esc(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><span class="bar-value">${formatter(value)}</span></div>`;
}

function groupTable(title, groups, metricLabel, formatter, minSampleSize) {
  const max = Math.max(0, ...groups.map((g) => g.mean || 0));
  const rows = groups.map((g) => `
    <tr>
      <td>${esc(g.key)}${g.lowSample ? ' <span class="warn">参考(n&lt;' + minSampleSize + ')</span>' : ""}</td>
      <td>${g.count}</td>
      <td>${formatter(g.mean)}</td>
      <td>${formatter(g.median)}</td>
    </tr>`).join("");
  return `
  <section class="card">
    <h3>${esc(title)}</h3>
    <table>
      <thead><tr><th>分類</th><th>件数</th><th>平均${esc(metricLabel)}</th><th>中央値</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="empty">データなし</td></tr>'}</tbody>
    </table>
  </section>`;
}

async function loadRecords() {
  const xRows = await sheets.readAllRows(config.spreadsheetId, config.sheets.x);
  const noteRows = await sheets.readAllRows(config.spreadsheetId, config.sheets.note);
  const hypoRows = await sheets.readAllRows(config.spreadsheetId, config.sheets.hypothesis);
  const xRecords = xRows.map(core.xRecordFromRow);
  const noteRecords = noteRows.map(core.noteRecordFromRow);
  return { xRecords, noteRecords, hypoRows };
}

function buildXSection(xRecords, minSampleSize) {
  if (!xRecords.length) {
    return { html: '<p class="empty">X投稿の記録がまだありません。add-x.cjs で記録を始めてください。</p>', summaryCards: "" };
  }
  const withRates72 = xRecords.map((r) => ({ ...r, _rates72: core.computeXRates(r, "72h") }));
  const validImpr = xRecords.map((r) => r["インプレッション_72h"]).filter((v) => v != null);

  const summaryCards = [
    ["投稿数", xRecords.length, (v) => v],
    ["平均インプレッション(72h)", core.mean(xRecords.map((r) => r["インプレッション_72h"])), (v) => num(v, 0)],
    ["平均共感率(72h)", core.mean(withRates72.map((r) => r._rates72.empathyRate)), pct],
    ["平均送客率(72h)", core.mean(withRates72.map((r) => r._rates72.clickRate)), pct],
    ["平均フォロー獲得率(72h)", core.mean(withRates72.map((r) => r._rates72.followRate)), pct],
  ].map(([label, value, fmt]) => `<div class="stat"><div class="stat-value">${fmt(value)}</div><div class="stat-label">${esc(label)}</div></div>`).join("");

  const genreGroups = core.summarizeGroups(core.groupBy(withRates72, "発信ジャンル", { multi: true }), (r) => r._rates72.empathyRate, minSampleSize);
  const lossGroups = core.summarizeGroups(core.groupBy(withRates72, "損失の種類", { multi: true }), (r) => r._rates72.empathyRate, minSampleSize);
  const lensGroups = core.summarizeGroups(core.groupBy(withRates72, "複眼設計の種類", { multi: true }), (r) => r._rates72.empathyRate, minSampleSize);
  const formatGroups = core.summarizeGroups(core.groupBy(withRates72, "投稿形式"), (r) => r._rates72.empathyRate, minSampleSize);
  const hookGroups = core.summarizeGroups(core.groupBy(withRates72, "フックの種類"), (r) => r._rates72.empathyRate, minSampleSize);
  const purposeGroups = core.summarizeGroups(core.groupBy(withRates72, "投稿の目的"), (r) => r._rates72.empathyRate, minSampleSize);
  const weekdayGroups = core.summarizeGroups(core.groupBy(withRates72, "曜日"), (r) => r._rates72.empathyRate, minSampleSize);

  const lenBuckets = withRates72.map((r) => ({ ...r, _lenBucket: core.bucketLabel(r["文字数"], config.textLengthBuckets) }));
  const lenGroups = core.summarizeGroups(core.groupBy(lenBuckets, "_lenBucket"), (r) => r._rates72.empathyRate, minSampleSize);

  const weeklyTrend = core.trend(xRecords, "投稿日", core.isoWeekKey, (r) => r["インプレッション_72h"]);
  const monthlyTrend = core.trend(xRecords, "投稿日", core.monthKey, (r) => r["インプレッション_72h"]);
  const trendMax = Math.max(1, ...weeklyTrend.map((t) => t.total));
  const weeklyTrendHtml = weeklyTrend.map((t) => barRow(t.key, t.total, trendMax, (v) => `${num(v, 0)} (${t.count}件)`)).join("");
  const monthlyTrendMax = Math.max(1, ...monthlyTrend.map((t) => t.total));
  const monthlyTrendHtml = monthlyTrend.map((t) => barRow(t.key, t.total, monthlyTrendMax, (v) => `${num(v, 0)} (${t.count}件)`)).join("");

  const { top, bottom } = core.topBottom(withRates72, (r) => r._rates72.empathyRate, 5);
  const topRows = (list) => list.map(({ record, value }) => `
    <tr><td>${esc(record["投稿日"])}</td><td class="text-cell">${esc(record["冒頭3行のフック"] || record["投稿全文"]).slice(0, 60)}</td><td>${pct(value)}</td></tr>
  `).join("") || '<tr><td colspan="3" class="empty">データなし</td></tr>';

  const html = `
  <section class="card stats-card">${summaryCards}</section>
  <section class="card">
    <h3>週間推移（インプレッション72h合計）</h3>
    ${weeklyTrendHtml || '<p class="empty">データなし</p>'}
  </section>
  <section class="card">
    <h3>月間推移（インプレッション72h合計）</h3>
    ${monthlyTrendHtml || '<p class="empty">データなし</p>'}
  </section>
  <div class="grid-2">
    ${groupTable("発信ジャンル別", genreGroups, "共感率", pct, minSampleSize)}
    ${groupTable("損失の種類別", lossGroups, "共感率", pct, minSampleSize)}
    ${groupTable("複眼設計別", lensGroups, "共感率", pct, minSampleSize)}
    ${groupTable("投稿形式別", formatGroups, "共感率", pct, minSampleSize)}
    ${groupTable("フックの種類別", hookGroups, "共感率", pct, minSampleSize)}
    ${groupTable("投稿目的別", purposeGroups, "共感率", pct, minSampleSize)}
    ${groupTable("曜日別", weekdayGroups, "共感率", pct, minSampleSize)}
    ${groupTable("文字数別", lenGroups, "共感率", pct, minSampleSize)}
  </div>
  <div class="grid-2">
    <section class="card">
      <h3>上位5投稿（共感率72h）</h3>
      <table><thead><tr><th>投稿日</th><th>冒頭フック</th><th>共感率</th></tr></thead><tbody>${topRows(top)}</tbody></table>
    </section>
    <section class="card">
      <h3>下位5投稿（共感率72h）</h3>
      <table><thead><tr><th>投稿日</th><th>冒頭フック</th><th>共感率</th></tr></thead><tbody>${topRows(bottom)}</tbody></table>
    </section>
  </div>`;
  return { html, summaryCards };
}

function buildNoteSection(noteRecords) {
  if (!noteRecords.length) {
    return '<p class="empty">note記事の記録がまだありません。add-note.cjs で記録を始めてください。</p>';
  }
  const totalRevenue = noteRecords.reduce((s, r) => s + (r["売上"] || 0), 0);
  const totalSales = noteRecords.reduce((s, r) => s + (r["販売数"] || 0), 0);
  const monthlyTrend = core.trend(noteRecords, "公開日", core.monthKey, (r) => r["売上"]);
  const max = Math.max(1, ...monthlyTrend.map((t) => t.total));
  const trendHtml = monthlyTrend.map((t) => barRow(t.key, t.total, max, (v) => `¥${num(v, 0)} (${t.count}本)`)).join("");
  const rows = noteRecords.map((r) => `
    <tr>
      <td>${esc(r["公開日"])}</td>
      <td class="text-cell">${esc(r["記事タイトル"])}</td>
      <td>${esc(r["無料・有料区分"])}</td>
      <td>${num(r["売上"], 0)}</td>
      <td>${num(r["販売数"], 0)}</td>
      <td>${num(r["PV"], 0)}</td>
    </tr>`).join("");
  return `
  <section class="card stats-card">
    <div class="stat"><div class="stat-value">${noteRecords.length}</div><div class="stat-label">記事数</div></div>
    <div class="stat"><div class="stat-value">¥${num(totalRevenue, 0)}</div><div class="stat-label">売上合計</div></div>
    <div class="stat"><div class="stat-value">${num(totalSales, 0)}</div><div class="stat-label">販売数合計</div></div>
  </section>
  <section class="card">
    <h3>月間売上推移</h3>
    ${trendHtml || '<p class="empty">データなし</p>'}
  </section>
  <section class="card">
    <h3>記事一覧</h3>
    <table>
      <thead><tr><th>公開日</th><th>タイトル</th><th>区分</th><th>売上</th><th>販売数</th><th>PV</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildHypothesisSection(hypoRows) {
  if (!hypoRows.length) return '<p class="empty">仮説ログがまだありません。add-hypothesis.cjs で記録してください。</p>';
  const rows = hypoRows.slice(-20).reverse().map((r) => `
    <tr><td>${esc(r[0])}</td><td class="text-cell">${esc(r[1])}</td><td class="text-cell">${esc(r[2])}</td><td class="text-cell">${esc(r[4])}</td><td class="text-cell">${esc(r[5])}</td></tr>`).join("");
  return `<table><thead><tr><th>日付</th><th>対象</th><th>仮説</th><th>結果</th><th>次回の改善案</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function page({ generatedAt, xHtml, noteHtml, hypoHtml, sampleWarning }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>烏龍式・SNS発信研究室</title>
<style>
  :root {
    --yellow: #FEDB02;
    --cream: #F9EECC;
    --ink: #1a1a1a;
    --muted: #6b6356;
    --card-bg: #fffdf6;
    --border: #e8dfc0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--cream); color: var(--ink);
    font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
    line-height: 1.6;
  }
  header {
    background: var(--yellow); padding: 28px 24px; border-bottom: 3px solid var(--ink);
  }
  header h1 { margin: 0; font-size: 1.5rem; letter-spacing: 0.02em; }
  header p { margin: 4px 0 0; font-size: 0.85rem; color: var(--ink); opacity: 0.75; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px; }
  h2.section-title {
    font-size: 1.1rem; margin: 36px 0 14px; padding-bottom: 6px;
    border-bottom: 2px solid var(--ink); display: flex; align-items: center; gap: 8px;
  }
  .card {
    background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
    padding: 18px 20px; margin-bottom: 16px;
  }
  .card h3 { margin: 0 0 12px; font-size: 0.95rem; }
  .stats-card { display: flex; flex-wrap: wrap; gap: 24px; }
  .stat { min-width: 140px; }
  .stat-value { font-size: 1.6rem; font-weight: 700; }
  .stat-label { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 760px) { .grid-2 { grid-template-columns: 1fr; } }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 600; font-size: 0.78rem; }
  .text-cell { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty { color: var(--muted); font-size: 0.85rem; padding: 10px 0; }
  .warn { color: #9a6b00; font-size: 0.72rem; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 0.82rem; }
  .bar-label { width: 110px; flex-shrink: 0; color: var(--muted); }
  .bar-track { flex: 1; background: var(--border); border-radius: 6px; height: 14px; overflow: hidden; }
  .bar-fill { background: var(--yellow); border: 1px solid var(--ink); height: 100%; border-radius: 6px 0 0 6px; }
  .bar-value { width: 140px; text-align: right; flex-shrink: 0; font-size: 0.78rem; }
  footer { max-width: 1100px; margin: 0 auto; padding: 8px 24px 32px; color: var(--muted); font-size: 0.75rem; }
</style>
</head>
<body>
<header>
  <h1>烏龍式・SNS発信研究室</h1>
  <p>生成日時: ${esc(generatedAt)}　/　すべて実測値。件数が少ない集計には「参考」の注記を付けています。</p>
</header>
<main>
  <h2 class="section-title">X投稿分析</h2>
  ${xHtml}
  <h2 class="section-title">note記事分析</h2>
  ${noteHtml}
  <h2 class="section-title">仮説・検証ログ（直近20件）</h2>
  ${hypoHtml}
</main>
<footer>推測と実測は区別しています。因果関係の断定ではなく、次の仮説づくりの材料として読んでください。</footer>
</body>
</html>`;
}

async function main() {
  if (!config.spreadsheetId) throw new Error("先に setup-sheet.cjs を実行してください（spreadsheetId未設定）");
  const { xRecords, noteRecords, hypoRows } = await loadRecords();
  const { html: xHtml } = buildXSection(xRecords, config.minSampleSize || 5);
  const noteHtml = buildNoteSection(noteRecords);
  const hypoHtml = buildHypothesisSection(hypoRows);

  const html = page({
    generatedAt: new Date().toISOString(),
    xHtml, noteHtml, hypoHtml,
  });

  const outPath = path.resolve(option("--out", path.join(__dirname, "dashboard", "index.html")));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`ダッシュボードを生成しました: ${outPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("失敗:", error.message || error);
    process.exit(1);
  });
}

module.exports = { buildXSection, buildNoteSection, buildHypothesisSection, page };
