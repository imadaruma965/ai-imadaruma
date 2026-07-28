const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  loadLocalEnv,
  hasCursorApiKey,
  getCursorApiKey,
  stripQuotes,
} = require("./load-local-env.cjs");

test("stripQuotes removes matching quotes", () => {
  assert.equal(stripQuotes('"abc"'), "abc");
  assert.equal(stripQuotes("'abc'"), "abc");
  assert.equal(stripQuotes("plain"), "plain");
});

test("loadLocalEnv is a no-op when file is missing (no crash)", () => {
  const env = {};
  const missing = path.join(os.tmpdir(), `no-env-${Date.now()}.local`);
  const result = loadLocalEnv({ envFile: missing, env });
  assert.equal(result.loaded, false);
  assert.deepEqual(env, {});
});

test("loadLocalEnv fills empty keys from file and never overwrites existing values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tb-env-"));
  const envFile = path.join(dir, ".env.local");
  fs.writeFileSync(
    envFile,
    [
      "# comment",
      'CURSOR_API_KEY="from-file"',
      "KEEP_ME=file-value",
      "EMPTY_ONLY=from-file",
      "",
    ].join("\n"),
    "utf8"
  );

  const env = {
    KEEP_ME: "already-set",
    EMPTY_ONLY: "",
  };
  const result = loadLocalEnv({ envFile, env });
  assert.equal(result.loaded, true);
  assert.equal(env.CURSOR_API_KEY, "from-file");
  assert.equal(env.KEEP_ME, "already-set");
  assert.equal(env.EMPTY_ONLY, "from-file");
  assert.ok(result.appliedKeys.includes("CURSOR_API_KEY"));
  assert.ok(!result.appliedKeys.includes("KEEP_ME"));
});

test("hasCursorApiKey and getCursorApiKey ignore whitespace-only values", () => {
  assert.equal(hasCursorApiKey({ CURSOR_API_KEY: "  " }), false);
  assert.equal(getCursorApiKey({ CURSOR_API_KEY: "  " }), undefined);
  assert.equal(hasCursorApiKey({ CURSOR_API_KEY: "cursor_x" }), true);
  assert.equal(getCursorApiKey({ CURSOR_API_KEY: " cursor_x " }), "cursor_x");
});
