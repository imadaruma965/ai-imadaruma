const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer, normalizeContext, turnPrompt, validDate, sanitizeStateData } = require("./server.cjs");

test("validDate accepts only ISO calendar-shaped dates", () => {
  assert.equal(validDate("2026-07-15"), true);
  assert.equal(validDate("2026/07/15"), false);
  assert.equal(validDate(""), false);
});

test("normalizeContext limits and sanitizes browser data", () => {
  const context = normalizeContext({
    goal: "今日の一事",
    completedToday: "2",
    tasks: [{ title: "請求処理", forced: 1 }, ...Array.from({ length: 40 }, (_, i) => ({ title: `任務${i}` }))],
  });
  assert.equal(context.goal, "今日の一事");
  assert.equal(context.completedToday, 2);
  assert.equal(context.tasks.length, 30);
  assert.equal(context.tasks[0].forced, true);
});

test("turnPrompt distinguishes opening from user messages", () => {
  const opening = turnPrompt({
    date: "2026-07-15",
    event: "open",
    message: "",
    context: {},
    firstTurn: true,
  });
  const message = turnPrompt({
    date: "2026-07-15",
    event: "message",
    message: "進捗を報告します",
    context: {},
    firstTurn: false,
  });
  assert.match(opening, /今日の計画を開いた/);
  assert.match(message, /進捗を報告します/);
});

test("sanitizeStateData normalizes persisted payload", () => {
  const data = sanitizeStateData({
    tasks: [{ id: "1", title: "任務" }],
    plans: { "day:2026-07-15": { goal: "一事" } },
  });
  assert.equal(data.tasks.length, 1);
  assert.equal(data.plans["day:2026-07-15"].goal, "一事");
  assert.equal(Array.isArray(data.categories), true);
});

test("status endpoint reports Cursor connection without exposing secrets", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/sontoku/status`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.connected, false);
  assert.equal(JSON.stringify(body).includes("cursor_"), false);
});
