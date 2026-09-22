const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createServer,
  normalizeContext,
  turnPrompt,
  validDate,
  sanitizeStateData,
  isAuthorized,
  isLoopbackAddress,
  checkSontokuRateLimit,
  computeTrackRecord,
  cabinetTurnPrompt,
} = require("./server.cjs");

// .env.local に実運用のTASKBOARD_TOKENが設定されている開発機でも、トークン未設定のCI環境でも
// 同じテストが通るよう、設定済みならヘッダを付ける(server.cjsの起動時loadLocalEnv()で既に反映済み)。
function tokenHeader(extra = {}) {
  const token = process.env.TASKBOARD_TOKEN || "";
  return token ? { ...extra, "X-Taskboard-Token": token } : extra;
}

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

test("sanitizeStateData normalizes missing salesPipeline (old state) to an empty array", () => {
  const data = sanitizeStateData({ tasks: [{ id: "1", title: "任務" }] });
  assert.equal(Array.isArray(data.salesPipeline), true);
  assert.equal(data.salesPipeline.length, 0);
});

test("sanitizeStateData normalizes missing ideaMemos to an empty array", () => {
  const data = sanitizeStateData({ tasks: [] });
  assert.equal(Array.isArray(data.ideaMemos), true);
  assert.equal(data.ideaMemos.length, 0);
});

test("sanitizeStateData preserves ideaMemos", () => {
  const data = sanitizeStateData({
    ideaMemos: [{ id: "im1", text: "Sound案", status: "open", source: "manual" }],
  });
  assert.equal(data.ideaMemos.length, 1);
  assert.equal(data.ideaMemos[0].text, "Sound案");
});

test("sanitizeStateData preserves salesPipeline records and survives a JSON round trip", () => {
  const data = sanitizeStateData({
    salesPipeline: [
      {
        id: "sp1",
        companyName: "A社",
        status: "meeting",
        proposalType: "heavy",
        estimatedAmount: 150000,
        nextActionDate: "2026-08-01",
      },
    ],
  });
  assert.equal(data.salesPipeline.length, 1);
  assert.equal(data.salesPipeline[0].companyName, "A社");

  // state.jsonへの保存はJSON.stringify/JSON.parseを経由するため、保存後の再読込を模して往復させても
  // 内容が変わらないことを確認する。
  const roundTripped = JSON.parse(JSON.stringify(data));
  assert.deepEqual(roundTripped.salesPipeline, data.salesPipeline);
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

test("isLoopbackAddress recognizes only localhost forms", () => {
  assert.equal(isLoopbackAddress("127.0.0.1"), true);
  assert.equal(isLoopbackAddress("::1"), true);
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("192.168.1.20"), false);
  assert.equal(isLoopbackAddress(""), false);
});

test("isAuthorized allows only localhost requests when TASKBOARD_TOKEN is unset", () => {
  const original = process.env.TASKBOARD_TOKEN;
  delete process.env.TASKBOARD_TOKEN;
  try {
    assert.equal(isAuthorized({ headers: {}, socket: { remoteAddress: "127.0.0.1" } }), true);
    assert.equal(isAuthorized({ headers: {}, socket: { remoteAddress: "::1" } }), true);
  } finally {
    if (original !== undefined) process.env.TASKBOARD_TOKEN = original;
  }
});

test("isAuthorized rejects LAN requests when TASKBOARD_TOKEN is unset", () => {
  const original = process.env.TASKBOARD_TOKEN;
  delete process.env.TASKBOARD_TOKEN;
  try {
    assert.equal(isAuthorized({ headers: {}, socket: { remoteAddress: "192.168.1.42" } }), false);
    assert.equal(isAuthorized({ headers: {}, socket: {} }), false);
    assert.equal(isAuthorized({ headers: {} }), false);
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

test("state endpoint stays reachable from localhost even when bound to 0.0.0.0 without a token", async (t) => {
  const original = process.env.TASKBOARD_TOKEN;
  delete process.env.TASKBOARD_TOKEN;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "0.0.0.0", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (original !== undefined) process.env.TASKBOARD_TOKEN = original;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/state`);
  assert.equal(response.status, 200);
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

test("sontoku and smart-rabbit status share the same Cursor API configured flag", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
    else delete process.env.CURSOR_API_KEY;
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const [sontoku, rabbit] = await Promise.all([
    fetch(`${base}/api/sontoku/status`).then((r) => r.json()),
    fetch(`${base}/api/smart-rabbit/status`).then((r) => r.json()),
  ]);
  assert.equal(sontoku.connected, false);
  assert.equal(rabbit.connected, false);

  process.env.CURSOR_API_KEY = "test-key-not-real";
  const [sontokuOn, rabbitOn] = await Promise.all([
    fetch(`${base}/api/sontoku/status`).then((r) => r.json()),
    fetch(`${base}/api/smart-rabbit/status`).then((r) => r.json()),
  ]);
  assert.equal(sontokuOn.connected, true);
  assert.equal(rabbitOn.connected, true);
  assert.equal(JSON.stringify(sontokuOn).includes("test-key"), false);
  assert.equal(JSON.stringify(rabbitOn).includes("test-key"), false);
});

test("sontoku POST returns 503 with a setup hint when CURSOR_API_KEY is missing", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/sontoku`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-07-28", event: "open", context: {} }),
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error, "cursor_api_key_missing");
  assert.match(body.message, /CURSOR_API_KEY/);
  assert.equal(JSON.stringify(body).includes("crsr_"), false);
  assert.equal(JSON.stringify(body).includes("test-key"), false);
});

test("cabinetTurnPrompt embeds member name and message, and names the responder", () => {
  const prompt = cabinetTurnPrompt({
    date: "2026-07-31",
    member: { id: "luca", name: "ルカ" },
    message: "今月の請求漏れを確認したい",
    event: "message",
    businessContextText: "【業務コンテキスト】\n■ 財政スナップショット\n  - 現在残高: 未登録",
    firstTurn: true,
  });
  assert.match(prompt, /今月の請求漏れを確認したい/);
  assert.match(prompt, /ルカとして、BOSSに直接返答すること/);
  assert.match(prompt, /財政スナップショット/);
});

test("cabinetTurnPrompt uses an opening request when event is 'open'", () => {
  const prompt = cabinetTurnPrompt({
    date: "2026-07-31",
    member: { id: "eiichi", name: "栄一" },
    message: "",
    event: "open",
    businessContextText: "",
    firstTurn: true,
  });
  assert.match(prompt, /栄一を呼び出した/);
});

test("cabinet endpoints reject requests without a valid token", async (t) => {
  const original = process.env.TASKBOARD_TOKEN;
  process.env.TASKBOARD_TOKEN = "secret-cabinet-123";
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (original === undefined) delete process.env.TASKBOARD_TOKEN;
    else process.env.TASKBOARD_TOKEN = original;
  });
  const address = server.address();
  const unauthorized = await fetch(`http://127.0.0.1:${address.port}/api/cabinet/members`);
  assert.equal(unauthorized.status, 401);
  const authorized = await fetch(`http://127.0.0.1:${address.port}/api/cabinet/members`, {
    headers: { "X-Taskboard-Token": "secret-cabinet-123" },
  });
  assert.equal(authorized.status, 200);
});

test("cabinet members endpoint lists all 11 personas without secrets", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/cabinet/members`, {
    headers: tokenHeader(),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.members.length, 11);
  assert.ok(body.members.some((m) => m.id === "smart_rabbit"));
  assert.ok(body.members.some((m) => m.id === "luca"));
  assert.equal(JSON.stringify(body).includes("cursor_"), false);
});

test("cabinet status endpoint reports connection state without secrets", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/cabinet/status`, {
    headers: tokenHeader(),
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.connected, false);
  assert.equal(JSON.stringify(body).includes("cursor_"), false);
});

test("cabinet POST returns 503 with a setup hint when CURSOR_API_KEY is missing", async (t) => {
  const originalKey = process.env.CURSOR_API_KEY;
  delete process.env.CURSOR_API_KEY;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalKey) process.env.CURSOR_API_KEY = originalKey;
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/cabinet`, {
    method: "POST",
    headers: tokenHeader({ "Content-Type": "application/json" }),
    body: JSON.stringify({ date: "2026-07-31", memberId: "eiichi", message: "こんにちは" }),
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error, "cursor_api_key_missing");
  assert.match(body.message, /\.env\.local/);
});

test("cabinet POST validates date, memberId, and message before calling the agent", async (t) => {
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
  const base = `http://127.0.0.1:${address.port}/api/cabinet`;
  const post = (body) =>
    fetch(base, { method: "POST", headers: tokenHeader({ "Content-Type": "application/json" }), body: JSON.stringify(body) });

  const badDate = await post({ date: "not-a-date", memberId: "eiichi", message: "hi" });
  assert.equal(badDate.status, 400);
  assert.equal((await badDate.json()).error, "invalid_date");

  const unknownMember = await post({ date: "2026-07-31", memberId: "not_a_real_member", message: "hi" });
  assert.equal(unknownMember.status, 400);
  assert.equal((await unknownMember.json()).error, "unknown_member");

  const emptyMessage = await post({ date: "2026-07-31", memberId: "eiichi", message: "   " });
  assert.equal(emptyMessage.status, 400);
  assert.equal((await emptyMessage.json()).error, "empty_message");
});
