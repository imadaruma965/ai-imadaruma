const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createServer,
  normalizeContext,
  turnPrompt,
  validDate,
  sanitizeStateData,
  isAuthorized,
  checkSontokuRateLimit,
  computeTrackRecord,
} = require("./server.cjs");

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
  assert.equal(Array.isArray(data.incidents), true);
  assert.equal(Array.isArray(data.invoices), true);
  assert.equal(Array.isArray(data.personalFinance.entries), true);
});

test("sanitizeStateData preserves appointments", () => {
  const data = sanitizeStateData({
    appointments: [
      {
        id: "ap1",
        title: "面談",
        startAt: "2026-07-18T01:00:00.000Z",
        endAt: "2026-07-18T02:00:00.000Z",
      },
    ],
  });
  assert.equal(data.appointments.length, 1);
  assert.equal(data.appointments[0].title, "面談");
});

test("sanitizeStateData preserves invoices and personal finance", () => {
  const data = sanitizeStateData({
    invoices: [{ id: "inv1", direction: "in", party: "A社", amount: 1000, status: "inbox" }],
    personalFinance: { entries: [{ id: "e1", type: "out", amount: 500, date: "2026-07-16" }] },
  });
  assert.equal(data.invoices[0].party, "A社");
  assert.equal(data.personalFinance.entries[0].amount, 500);
});

test("sanitizeStateData preserves liabilities and fiscalMeta", () => {
  const data = sanitizeStateData({
    liabilities: [{ id: "l1", creditor: "大家", balance: 120000, status: "overdue", kind: "rent" }],
    fiscalMeta: { defenseLine: 300000, note: "家賃＋税" },
  });
  assert.equal(data.liabilities[0].creditor, "大家");
  assert.equal(data.fiscalMeta.defenseLine, 300000);
  assert.equal(data.fiscalMeta.note, "家賃＋税");
});

test("sanitizeStateData preserves incident log entries", () => {
  const data = sanitizeStateData({
    incidents: [{ id: "i1", date: "2026-07-16", type: "探索衝動", note: "調べ物に逸れた" }],
  });
  assert.equal(data.incidents.length, 1);
  assert.equal(data.incidents[0].type, "探索衝動");
});

test("computeTrackRecord counts recent completions and overdue forced tasks", () => {
  const stateData = {
    tasks: [
      { status: "done", updatedAt: "2026-07-14T00:00:00.000Z" }, // within 14 days of 07-16
      { status: "done", updatedAt: "2026-06-01T00:00:00.000Z" }, // outside window
      { forced: true, status: "todo", dueDate: "2026-07-10" }, // overdue
      { forced: true, status: "todo", dueDate: "2026-07-20" }, // not yet due
      { forced: true, status: "done", dueDate: "2026-07-01" }, // done, not overdue
    ],
  };
  const track = computeTrackRecord(stateData, "2026-07-16");
  assert.equal(track.completedRecent, 1);
  assert.equal(track.forcedOverdue, 1);
  assert.equal(track.forcedTotal, 3);
});

test("isAuthorized allows any request when TASKBOARD_TOKEN is unset", () => {
  const original = process.env.TASKBOARD_TOKEN;
  delete process.env.TASKBOARD_TOKEN;
  try {
    assert.equal(isAuthorized({ headers: {} }), true);
  } finally {
    if (original !== undefined) process.env.TASKBOARD_TOKEN = original;
  }
});

test("isAuthorized requires a matching X-Taskboard-Token header when configured", () => {
  const original = process.env.TASKBOARD_TOKEN;
  process.env.TASKBOARD_TOKEN = "secret-123";
  try {
    assert.equal(isAuthorized({ headers: {} }), false);
    assert.equal(isAuthorized({ headers: { "x-taskboard-token": "wrong" } }), false);
    assert.equal(isAuthorized({ headers: { "x-taskboard-token": "secret-123" } }), true);
  } finally {
    if (original === undefined) delete process.env.TASKBOARD_TOKEN;
    else process.env.TASKBOARD_TOKEN = original;
  }
});

test("state and sontoku endpoints reject requests without a valid token", async (t) => {
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
  const unauthorized = await fetch(`http://127.0.0.1:${address.port}/api/state`);
  assert.equal(unauthorized.status, 401);
  const authorized = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
    headers: { "X-Taskboard-Token": "secret-123" },
  });
  assert.equal(authorized.status, 200);
});

test("checkSontokuRateLimit blocks once the per-minute limit is exceeded", () => {
  const date = "2026-07-16";
  const now = Date.now();
  for (let i = 0; i < 10; i += 1) {
    assert.equal(checkSontokuRateLimit(date, now + i), true);
  }
  assert.equal(checkSontokuRateLimit(date, now + 10), false);
  // A different date has its own independent window.
  assert.equal(checkSontokuRateLimit("2026-07-17", now), true);
  // After the window elapses, calls are allowed again.
  assert.equal(checkSontokuRateLimit(date, now + 61000), true);
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
