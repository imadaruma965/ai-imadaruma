#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const core = require("./lib/core.cjs");
const sheetWriter = require("./lib/sheets.cjs");

const ROOT = __dirname;
const DEFAULT_STATE = path.join(ROOT, "data", "state.json");
const DEFAULT_SPREADSHEET_ID = "1ivU9yTi0cxA1jp6mybSZyb3K93A5X8BAqYoOHLgVuuY";
const DEFAULT_SOURCES = ["AI活用", "起業", "副業", "仕事術", "自己啓発", "note収益化"];
const USER_AGENT = "ImadarumaNoteResearch/0.1 (public metadata research; low frequency)";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPublicPage(rawUrl, delayMs) {
  const url = core.assertAllowedPublicUrl(rawUrl);
  if (delayMs) await sleep(delayMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimited(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        output[index] = await worker(items[index], index);
      } catch (error) {
        console.error(`取得失敗: ${items[index]}: ${error.message}`);
        output[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return output;
}

async function main() {
  const limit = Number(option("--limit", "50"));
  const maxAgeDays = Number(option("--max-age-days", "30"));
  const delayMs = Number(option("--delay-ms", "1400"));
  const statePath = path.resolve(option("--state", DEFAULT_STATE));
  const observedAt = new Date().toISOString();
  const sourceArgs = process.argv.flatMap((arg, index) => arg === "--source" ? [process.argv[index + 1]] : []).filter(Boolean);
  const labels = sourceArgs.length ? sourceArgs : DEFAULT_SOURCES;
  const sourceUrls = labels.map((label) => ({ label, url: `https://note.com/hashtag/${encodeURIComponent(label)}` }));

  console.log(`公開メタデータ収集: ${labels.join(" / ")}`);
  const discovered = [];
  for (const source of sourceUrls) {
    const html = await fetchPublicPage(source.url, delayMs);
    const notes = core.extractNotesFromHtml(html, source.label);
    console.log(`  #${source.label}: ${notes.length}件`);
    discovered.push(...notes);
  }
  const unique = [...new Map(discovered.map((note) => [note.key, note])).values()];
  console.log(`重複除外後: ${unique.length}件`);

  const recent = core
    .scoreArticles(unique, { articles: {}, authors: {} }, observedAt, maxAgeDays)
    .slice(0, limit);
  const authors = [...new Set(recent.map((note) => note.urlname))];
  console.log(`プロフィール公開値を確認: ${authors.length}著者`);
  const profileResults = await mapLimited(authors, 4, async (urlname) => {
    const html = await fetchPublicPage(`https://note.com/${urlname}`, Math.max(400, Math.floor(delayMs / 3)));
    return [urlname, core.extractProfileFromHtml(html, urlname)];
  });
  const profiles = new Map(profileResults.filter(Boolean));
  for (const note of recent) {
    const profile = profiles.get(note.urlname);
    note.followers = profile?.followers ?? null;
    note.authorNoteCount = profile?.noteCount ?? null;
  }

  const previousState = core.loadState(statePath);
  const ranked = core.scoreArticles(recent, previousState, observedAt, maxAgeDays).slice(0, limit);
  console.log(`TOP${ranked.length}:`);
  ranked.slice(0, 10).forEach((article, index) => {
    console.log(`${String(index + 1).padStart(2)}. ${article.title} | スキ${article.likes} | ${article.author}`);
  });

  if (process.argv.includes("--dry-run") || process.argv.includes("--no-sheets")) {
    console.log("Sheetsへの書き込みはスキップしました。");
  } else {
    const result = await sheetWriter.writeResults({
      spreadsheetId: option("--spreadsheet-id", process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID),
      currentSheet: option("--current-sheet", "note最新TOP50"),
      historySheet: option("--history-sheet", "note観測履歴"),
      articles: ranked,
      observedAt,
      serviceAccountPath: option("--service-account", undefined),
    });
    console.log(`Google Sheetsへ${result.rowCount}件を書き込みました: ${result.url}`);
  }
  if (!process.argv.includes("--dry-run")) core.saveState(statePath, recent, observedAt);
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
