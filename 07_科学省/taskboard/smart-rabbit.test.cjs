const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createServer,
  normalizeSmartRabbitContext,
  smartRabbitTurnPrompt,
  knowledgeBlock,
  checkSmartRabbitRateLimit,
  cacheSmartRabbitResult,
  getCachedSmartRabbitResult,
  contentHashOf,
  sanitizeBusiness,
  sanitizeStateData,
} = require("./server.cjs");

test("sanitizeBusiness defaults missing/malformed business data to editable-empty structures", () => {
  assert.deepEqual(sanitizeBusiness(undefined), {
    instagram: { brandName: "", tagline: "", pillars: [], updatedAt: null },
    services: [],
    researchProjects: [],
  });
  const custom = sanitizeBusiness({
    instagram: { brandName: "賢いウサギ", pillars: ["A", "B"] },
    services: [{ name: "X" }],
    researchProjects: [{ theme: "Y" }],
  });
  assert.equal(custom.instagram.brandName, "賢いウサギ");
  assert.deepEqual(custom.instagram.pillars, ["A", "B"]);
  assert.equal(custom.services.length, 1);
  assert.equal(custom.researchProjects.length, 1);
});

test("sanitizeStateData migrates old state.json (no business key) with defaults, no crash", () => {
  const legacy = { tasks: [{ id: "1", title: "旧タスク" }] };
  const data = sanitizeStateData(legacy);
  assert.deepEqual(data.business.services, []);
  assert.deepEqual(data.business.researchProjects, []);
  assert.equal(data.business.instagram.brandName, "");
});

test("normalizeSmartRabbitContext clips and sanitizes browser data", () => {
  const context = normalizeSmartRabbitContext({
    goal: "月商50万円",
    tasks: Array.from({ length: 30 }, (_, i) => ({ title: `任務${i}` })),
    activeAlerts: Array.from({ length: 10 }, (_, i) => ({ title: `警報${i}` })),
    salesSummary: { candidate: 3 },
  });
  assert.equal(context.goal, "月商50万円");
  assert.equal(context.tasks.length, 15);
  assert.equal(context.activeAlerts.length, 5);
  assert.deepEqual(context.salesSummary, { candidate: 3 });
});

test("normalizeSmartRabbitContext defaults missing fields safely", () => {
  const context = normalizeSmartRabbitContext(null);
  assert.equal(context.goal, "");
  assert.deepEqual(context.tasks, []);
  assert.deepEqual(context.activeAlerts, []);
  assert.equal(context.salesSummary, null);
});

test("knowledgeBlock reports unavailable search without pretending results exist", () => {
  const text = knowledgeBlock({ available: false, error: "vault_not_found", query: "月商", results: [] });
  assert.match(text, /利用不可/);
  assert.match(text, /vault_not_found/);
});

test("knowledgeBlock reports no hits explicitly instead of fabricating", () => {
  const text = knowledgeBlock({ available: true, query: "存在しない語", results: [] });
  assert.match(text, /該当するKnowledgeなし/);
});

test("knowledgeBlock lists paths when results are found", () => {
  const text = knowledgeBlock({
    available: true,
    query: "営業",
    results: [{ path: "02_国家事業/foo.md", heading: "営業方針", excerpt: "抜粋" }],
  });
  assert.match(text, /02_国家事業\/foo\.md/);
  assert.match(text, /参照したKnowledge/);
});

test("smartRabbitTurnPrompt embeds mode, message, and knowledge block", () => {
  const prompt = smartRabbitTurnPrompt({
    date: "2026-07-28",
    mode: "sales",
    message: "新規案件の営業文面を考えて",
    context: { goal: "月商50万円" },
    knowledge: { available: true, query: "営業", results: [] },
    firstTurn: true,
  });
  assert.match(prompt, /営業/);
  assert.match(prompt, /新規案件の営業文面を考えて/);
  assert.match(prompt, /スマートラビットとして/);
});

test("checkSmartRabbitRateLimit blocks once the per-minute limit is exceeded", () => {
  const sessionKey = "sr-2026-07-28-rate-test";
  const now = Date.now();
  for (let i = 0; i < 10; i += 1) {
    assert.equal(checkSmartRabbitRateLimit(sessionKey, now + i), true);
  }
  assert.equal(checkSmartRabbitRateLimit(sessionKey, now + 10), false);
  assert.equal(checkSmartRabbitRateLimit("sr-other-session", now), true);
  assert.equal(checkSmartRabbitRateLimit(sessionKey, now + 61000), true);
});

test("contentHashOf is deterministic and distinguishes different text", () => {
  assert.equal(contentHashOf("こんにちは"), contentHashOf("こんにちは"));
  assert.notEqual(contentHashOf("こんにちは"), contentHashOf("こんばんは"));
});

test("smart-rabbit request cache dedupes replays of the same messageId within TTL", () => {
  const messageId = `msg-${Date.now()}`;
  assert.equal(getCachedSmartRabbitResult(messageId), null);
  cacheSmartRabbitResult(messageId, { reply: "ok" });
  assert.deepEqual(getCachedSmartRabbitResult(messageId), { reply: "ok" });
  // Expired entries are treated as a miss.
  assert.equal(getCachedSmartRabbitResult(messageId, Date.now() + 11 * 60 * 1000), null);
});

test("smart-rabbit endpoints reject requests without a valid token", async (t) => {
  const original = process.env.TASKBOARD_TOKEN;
  process.env.TASKBOARD_TOKEN = "secret-123";
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (original === undefined) delete process.env.TASKBOARD_TOKEN;
    else process.env.TASKBOARD_TOKEN = original;
  });
  const address = server.address();
  const unauthorized = await fetch(`http://127.0.0.1:${address.port}/api/smart-rabbit/status`);
  assert.equal(unauthorized.status, 401);
  const authorized = await fetch(`http://127.0.0.1:${address.port}/api/smart-rabbit/status`, {
    headers: { "X-Taskboard-Token": "secret-123" },
  });
  assert.equal(authorized.status, 200);
});

test("smart-rabbit status endpoint reports connection state and mode list without secrets", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/smart-rabbit/status`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.connected, false);
  assert.ok(Array.isArray(body.modes) && body.modes.length === 7);
  assert.equal(JSON.stringify(body).includes("cursor_"), false);
});

test("smart-rabbit POST returns 503 with a setup hint when CURSOR_API_KEY is missing", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/smart-rabbit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-07-28", sessionId: "sr-test", message: "こんにちは" }),
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error, "cursor_api_key_missing");
  assert.match(body.message, /\.env\.local/);
});

test("smart-rabbit POST validates date, message, and sessionId before calling the agent", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  process.env.CURSOR_API_KEY = "test-key-not-real";
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey === undefined) delete process.env.CURSOR_API_KEY;
    else process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}/api/smart-rabbit`;
  const post = (body) =>
    fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const badDate = await post({ date: "not-a-date", sessionId: "sr-1", message: "hi" });
  assert.equal(badDate.status, 400);
  assert.equal((await badDate.json()).error, "invalid_date");

  const emptyMessage = await post({ date: "2026-07-28", sessionId: "sr-1", message: "   " });
  assert.equal(emptyMessage.status, 400);
  assert.equal((await emptyMessage.json()).error, "empty_message");

  const missingSession = await post({ date: "2026-07-28", message: "hi" });
  assert.equal(missingSession.status, 400);
  assert.equal((await missingSession.json()).error, "missing_session");
});

test("smart-rabbit context preview: invalid mode returns 400 without touching the agent", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/smart-rabbit/context?mode=not_a_real_mode`);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "invalid_mode");
});

test("smart-rabbit context preview: works for all modes without CURSOR_API_KEY (no real AI call)", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const modes = ["general", "today", "sales", "instagram", "research", "product", "finance"];
  for (const mode of modes) {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/smart-rabbit/context?mode=${mode}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, mode);
    assert.ok(Array.isArray(body.sections));
    assert.equal(JSON.stringify(body).includes("cursor_"), false);
  }
});
