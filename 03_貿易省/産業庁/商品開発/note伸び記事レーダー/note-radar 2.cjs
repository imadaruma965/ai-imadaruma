#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const core = require("./lib/core.cjs");
const http = require("./lib/http.cjs");
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
  return http.fetchText(url.toString(), {
    delayMs,
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
  });
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
        console.error(`取得失敗: ${items[index]}: ${http.formatError(error)}`);
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
  const failedSources = [];
  for (const source of sourceUrls) {
    try {
      const html = await fetchPublicPage(source.url, delayMs);
      const notes = core.extractNotesFromHtml(html, source.label);
      console.log(`  #${source.label}: ${notes.length}件`);
      discovered.push(...notes);
    } catch (error) {
      failedSources.push(source.label);
      console.error(`  #${source.label}: 取得失敗 ${error.message}`);
    }
  }
  if (!discovered.length) {
    throw new Error(`全ハッシュタグの取得に失敗した${failedSources.length ? ` (${failedSources.join(", ")})` : ""}`);
  }
  if (failedSources.length) {
    console.error(`一部タグをスキップして続行: ${failedSources.join(", ")}`);
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

  const outputJson = option("--output-json", null);
  if (outputJson) {
    const outputPath = path.resolve(outputJson);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify({ observedAt, labels, articles: ranked }, null, 2)}\n`, "utf8");
    console.log(`分析JSONを書き出しました: ${outputPath}`);
  }

  if (process.argv.includes("--dry-run") || process.argv.includes("--no-sheets")) {
    console.log("Sheetsへの書き込みはスキップしました。");
  } else {
    try {
      const result = await http.retryAsync(
        () => sheetWriter.writeResults({
          spreadsheetId: option("--spreadsheet-id", process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID),
          currentSheet: option("--current-sheet", "note最新TOP50"),
          historySheet: option("--history-sheet", "note観測履歴"),
          articles: ranked,
          observedAt,
          serviceAccountPath: option("--service-account", undefined),
        }),
        { retries: 3, label: "Google Sheets書き込み" },
      );
      console.log(`Google Sheetsへ${result.rowCount}件を書き込みました: ${result.url}`);
    } catch (error) {
      console.error(`Sheets書き込みは失敗したが、ローカル観測は保存する: ${http.formatError(error)}`);
    }
  }
  if (!process.argv.includes("--dry-run")) core.saveState(statePath, recent, observedAt);
}

main().catch((error) => {
  console.error("失敗:", error.message || error);
  process.exit(1);
});
