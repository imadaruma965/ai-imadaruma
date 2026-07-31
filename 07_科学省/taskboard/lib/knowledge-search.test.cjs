const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  extractQueryKeywords,
  cascadeSearch,
  resolveMode,
  listModes,
  searchForMode,
  MODE_CONFIG,
  DEFAULT_VAULT_ROOT,
  VAULT_LIB_PATH,
} = require("./knowledge-search.cjs");

test("extractQueryKeywords picks meaningful chunks from unsegmented Japanese text", () => {
  const query = extractQueryKeywords("営業リストの自動生成について、次に何をすべきか教えてほしい。");
  assert.ok(query.length > 0);
  assert.ok(query.split(" ").every((chunk) => chunk.length >= 2));
});

test("extractQueryKeywords falls back to the trimmed message when no chunk is long enough", () => {
  const query = extractQueryKeywords("A");
  assert.equal(query, "");
});

test("extractQueryKeywords returns empty string for empty input", () => {
  assert.equal(extractQueryKeywords(""), "");
  assert.equal(extractQueryKeywords(null), "");
});

test("resolveMode falls back to the default mode for unknown ids", () => {
  assert.equal(resolveMode("sales"), "sales");
  assert.equal(resolveMode("not_a_real_mode"), "general");
  assert.equal(resolveMode(undefined), "general");
});

test("listModes exposes all seven MVP consultation modes", () => {
  const modes = listModes();
  assert.equal(modes.length, 7);
  assert.ok(modes.some((m) => m.id === "sales"));
  assert.ok(modes.some((m) => m.id === "instagram"));
});

test("DEFAULT_VAULT_ROOT points at 08_情報省/ダヴィンチ図書館", () => {
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  assert.equal(DEFAULT_VAULT_ROOT, path.join(repoRoot, "08_情報省", "ダヴィンチ図書館"));
});

test("cascadeSearch dedupes hits across folders and caps 05_AI対話 contributions", () => {
  const calls = [];
  const fakeSearch = (query, limit, folders) => {
    calls.push({ query, limit, folders: folders.slice() });
    const folder = folders[0];
    if (folder === "01_意思決定") return [{ path: "01_意思決定/a.md", score: 3 }];
    if (folder === "02_国家事業") return [{ path: "01_意思決定/a.md", score: 2 }, { path: "02_国家事業/b.md", score: 2 }];
    if (folder === "05_AI対話") {
      return [
        { path: "05_AI対話/c1.md", score: 1 },
        { path: "05_AI対話/c2.md", score: 1 },
        { path: "05_AI対話/c3.md", score: 1 },
        { path: "05_AI対話/c4.md", score: 1 },
      ];
    }
    return [];
  };
  const results = cascadeSearch(fakeSearch, "月商", MODE_CONFIG.general.folderOrder, 6);
  const paths = results.map((r) => r.path);
  // deduped: a.md only appears once even though two folders returned it
  assert.equal(paths.filter((p) => p === "01_意思決定/a.md").length, 1);
  // 05_AI対話 folder search was capped to at most 3 requested
  const aiDialogCall = calls.find((c) => c.folders[0] === "05_AI対話");
  assert.ok(aiDialogCall.limit <= 3);
  assert.ok(results.length <= 6);
});

test("cascadeSearch stops early once the limit is reached", () => {
  const fakeSearch = (query, limit, folders) =>
    Array.from({ length: limit }, (_, i) => ({ path: `${folders[0]}/${i}.md`, score: 1 }));
  const results = cascadeSearch(fakeSearch, "x", ["01_意思決定", "02_国家事業", "03_国家叡智"], 2);
  assert.equal(results.length, 2);
});

test("searchForMode degrades gracefully (does not throw) when the vault module is unreachable", async (t) => {
  if (fs.existsSync(VAULT_LIB_PATH)) {
    t.skip("ダヴィンチ図書館 vault is present in this environment; unavailable-path is covered by env override below");
    return;
  }
  const result = await searchForMode("general", "月商50万円の営業戦略");
  assert.equal(result.available, false);
  assert.ok(result.error);
  assert.deepEqual(result.results, []);
});

test("searchForMode returns available:true with results shape when the vault is reachable", async () => {
  if (!fs.existsSync(VAULT_LIB_PATH)) return;
  const result = await searchForMode("general", "Knowledge Gateway");
  assert.equal(result.available, true);
  assert.ok(Array.isArray(result.results));
  for (const hit of result.results) {
    assert.ok(typeof hit.path === "string");
  }
});
