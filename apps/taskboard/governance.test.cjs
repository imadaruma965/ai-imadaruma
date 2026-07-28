const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GOVERNANCE_DOMAINS,
  GovernanceEvent,
  assessDomains,
  detectGovernanceAlerts,
  getGovernanceAlerts,
  buildGovernanceContext,
} = require("./governance.js");

function blankState() {
  return {
    tasks: [],
    plans: {},
    kpis: {},
    board: {},
    sontokuChat: {},
    incidents: [],
    invoices: [],
    personalFinance: { entries: [] },
    appointments: [],
    liabilities: [],
  };
}

test("assessDomains always returns all five domains in fixed order", () => {
  const result = assessDomains(blankState(), { now: new Date("2026-07-24T10:00:00") });
  assert.deepEqual(result.map((r) => r.id), GOVERNANCE_DOMAINS);
  assert.deepEqual(GOVERNANCE_DOMAINS, ["personality", "naisei", "diplomacy", "finance", "constitution"]);
});

test("domains become unknown when there is no underlying data", () => {
  const result = assessDomains(blankState(), { now: new Date("2026-07-24T10:00:00") });
  const byId = Object.fromEntries(result.map((r) => [r.id, r]));
  assert.equal(byId.personality.status, "unknown");
  assert.equal(byId.naisei.status, "unknown");
  assert.equal(byId.diplomacy.status, "unknown");
  assert.equal(byId.finance.status, "unknown");
  // constitution is always machine-judgeable (goal set or not), never unknown
  assert.notEqual(byId.constitution.status, "unknown");
});

test("overdue external tasks lower the diplomacy score", () => {
  const state = blankState();
  state.tasks = [
    { id: "t1", title: "請求フォロー", status: "todo", dueDate: "2026-07-01", external: true, deletedAt: null },
  ];
  const now = new Date("2026-07-24T10:00:00");
  const [, , diplomacy] = assessDomains(state, { now });
  assert.ok(diplomacy.score < 70, `expected diplomacy score < 70, got ${diplomacy.score}`);
  assert.notEqual(diplomacy.status, "unknown");
});

test("overdue liabilities lower the finance score", () => {
  const state = blankState();
  state.liabilities = [{ id: "l1", status: "overdue", updatedAt: "2026-07-20T00:00:00.000Z" }];
  const now = new Date("2026-07-24T10:00:00");
  const [, , , finance] = assessDomains(state, { now });
  assert.ok(finance.score < 70, `expected finance score < 70, got ${finance.score}`);
});

test("daily_one_not_selected fires when plans[day].goal is empty", () => {
  const state = blankState();
  const now = new Date("2026-07-24T10:00:00");
  const alerts = detectGovernanceAlerts(state, { now });
  assert.ok(alerts.some((a) => a.type === "daily_one_not_selected"));
});

test("daily_one_not_selected does not fire once goal is set", () => {
  const state = blankState();
  state.plans["day:2026-07-24"] = { goal: "sound受注の初回連絡" };
  const now = new Date("2026-07-24T10:00:00");
  const alerts = detectGovernanceAlerts(state, { now });
  assert.ok(!alerts.some((a) => a.type === "daily_one_not_selected"));
});

test("finance_not_updated fires when the most recent finance touch is stale", () => {
  const state = blankState();
  state.invoices = [{ id: "i1", direction: "in", status: "inbox", updatedAt: "2026-07-19T00:00:00.000Z" }];
  const now = new Date("2026-07-24T10:00:00");
  const alerts = detectGovernanceAlerts(state, { now });
  assert.ok(alerts.some((a) => a.type === "finance_not_updated"));
});

test("finance_not_updated does not fire when finance was touched today", () => {
  const state = blankState();
  const now = new Date("2026-07-24T10:00:00");
  state.invoices = [{ id: "i1", direction: "in", status: "inbox", updatedAt: now.toISOString() }];
  const alerts = detectGovernanceAlerts(state, { now });
  assert.ok(!alerts.some((a) => a.type === "finance_not_updated"));
});

test("overdue_tasks_exist disappears once the task is resolved (marked done)", () => {
  const now = new Date("2026-07-24T10:00:00");
  const overdueState = blankState();
  overdueState.tasks = [{ id: "t1", title: "請求", status: "todo", dueDate: "2026-07-01", deletedAt: null }];
  const beforeAlerts = detectGovernanceAlerts(overdueState, { now });
  assert.ok(beforeAlerts.some((a) => a.type === "overdue_tasks_exist"));

  const resolvedState = blankState();
  resolvedState.tasks = [{ id: "t1", title: "請求", status: "done", dueDate: "2026-07-01", deletedAt: null }];
  const afterAlerts = detectGovernanceAlerts(resolvedState, { now });
  assert.ok(!afterAlerts.some((a) => a.type === "overdue_tasks_exist"));
});

test("legacy/broken state without expected keys does not throw and yields safe defaults", () => {
  const legacyState = { tasks: undefined, plans: null, kpis: null };
  const now = new Date("2026-07-24T10:00:00");
  assert.doesNotThrow(() => assessDomains(legacyState, { now }));
  assert.doesNotThrow(() => detectGovernanceAlerts(legacyState, { now }));
  const result = assessDomains(legacyState, { now });
  assert.equal(result.length, 5);
});

test("buildGovernanceContext returns the documented key set", () => {
  const state = blankState();
  const now = new Date("2026-07-24T10:00:00");
  const context = buildGovernanceContext(state, { now });
  assert.deepEqual(Object.keys(context).sort(), [
    "activeAlerts",
    "calendarSummary",
    "currentDate",
    "dailyOne",
    "domainAssessments",
    "financeSummary",
    "governanceSummary",
    "habitSummary",
    "kpi",
    "todayTasks",
  ]);
  assert.equal(context.currentDate, "2026-07-24");
  assert.equal(context.domainAssessments.length, 5);
});

test("UI can render with no diagnostics: alerts array is always an array, even for an empty state", () => {
  const now = new Date("2026-07-24T03:00:00");
  const alerts = detectGovernanceAlerts(blankState(), { now });
  assert.ok(Array.isArray(alerts));
});

test("getGovernanceAlerts is the common entry point and matches detectGovernanceAlerts", () => {
  const state = blankState();
  state.tasks = [{ id: "t1", title: "請求", status: "todo", dueDate: "2026-07-01", deletedAt: null }];
  const now = new Date("2026-07-24T10:00:00");
  assert.deepEqual(getGovernanceAlerts(state, { now }), detectGovernanceAlerts(state, { now }));
});

test("GovernanceEvent defines the five common event names and nothing else references them yet", () => {
  assert.deepEqual(Object.keys(GovernanceEvent).sort(), [
    "FINANCE_NOT_UPDATED",
    "NIGHT_REVIEW_MISSING",
    "SALES_ZERO",
    "TASK_OVERDUE",
    "TODAY_NOT_STARTED",
  ]);
  assert.equal(GovernanceEvent.TASK_OVERDUE, "TASK_OVERDUE");
  assert.ok(Object.isFrozen(GovernanceEvent));
});

test("buildGovernanceContext().governanceSummary highlights the worst domain and the top alert", () => {
  const state = blankState();
  // 憲法は「今日の一事」設定済みでstableにしておき、財政だけがdanger（唯一の最下位）になる状況を作る。
  state.plans["day:2026-07-24"] = { goal: "sound受注の初回連絡" };
  state.liabilities = [
    { id: "l1", status: "overdue", updatedAt: "2026-07-24T00:00:00.000Z" },
    { id: "l2", status: "overdue", updatedAt: "2026-07-24T00:00:00.000Z" },
  ];
  const now = new Date("2026-07-24T10:00:00");
  const { governanceSummary } = buildGovernanceContext(state, { now });
  assert.equal(governanceSummary.domainStatusList.length, 5);
  assert.equal(governanceSummary.focusDomain.id, "finance");
  assert.equal(governanceSummary.focusDomain.status, "danger");
  assert.equal(governanceSummary.topAlert.type, "external_obligation_overdue");
  assert.equal(typeof governanceSummary.oneLineSummary, "string");
  assert.ok(governanceSummary.oneLineSummary.length > 0);
});

test("buildGovernanceContext().governanceSummary.topAlert is null when nothing is detected", () => {
  const state = blankState();
  // 3時（朝9時・夜21時の閾値の外）・一事設定済み・売上行動済みなら、警報が一件も出ない状態を作れる。
  state.plans["day:2026-07-24"] = { goal: "sound受注の初回連絡" };
  state.kpis["2026-07-24"] = { salesTarget: 1, sales: 1 };
  const now = new Date("2026-07-24T03:00:00");
  const alerts = detectGovernanceAlerts(state, { now });
  assert.deepEqual(alerts, []);
  const { governanceSummary } = buildGovernanceContext(state, { now });
  assert.equal(governanceSummary.topAlert, null);
  assert.ok(governanceSummary.focusDomain);
  assert.equal(typeof governanceSummary.oneLineSummary, "string");
});
