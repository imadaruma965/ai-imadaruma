const test = require("node:test");
const assert = require("node:assert/strict");
const { createGovernanceMonitor } = require("./governance-monitor.js");

test("checkNow() reports every alert as new on the first check", () => {
  const alerts = [{ type: "overdue_tasks_exist", relatedEntityId: "t1" }, { type: "sales_action_missing", relatedEntityId: null }];
  const received = [];
  const monitor = createGovernanceMonitor({
    getState: () => ({}),
    computeAlerts: () => alerts,
    onNewAlert: (a) => received.push(a),
  });
  const first = monitor.checkNow();
  assert.equal(first.length, 2);
  assert.equal(received.length, 2);
});

test("checkNow() does not re-report an alert that is still active on the next check", () => {
  const alerts = [{ type: "overdue_tasks_exist", relatedEntityId: "t1" }];
  const received = [];
  const monitor = createGovernanceMonitor({
    getState: () => ({}),
    computeAlerts: () => alerts,
    onNewAlert: (a) => received.push(a),
  });
  monitor.checkNow();
  const second = monitor.checkNow();
  assert.equal(second.length, 0);
  assert.equal(received.length, 1);
});

test("an alert that disappears and later reappears is treated as new again", () => {
  let alerts = [{ type: "finance_not_updated", relatedEntityId: null }];
  const received = [];
  const monitor = createGovernanceMonitor({
    getState: () => ({}),
    computeAlerts: () => alerts,
    onNewAlert: (a) => received.push(a),
  });
  monitor.checkNow(); // 新規として1回
  alerts = [];
  monitor.checkNow(); // 消える
  alerts = [{ type: "finance_not_updated", relatedEntityId: null }];
  const third = monitor.checkNow(); // 再度「新規」扱い
  assert.equal(third.length, 1);
  assert.equal(received.length, 2);
});

test("distinct entities of the same alert type are tracked independently", () => {
  const alerts = [
    { type: "overdue_tasks_exist", relatedEntityId: "t1" },
    { type: "overdue_tasks_exist", relatedEntityId: "t2" },
  ];
  const monitor = createGovernanceMonitor({ getState: () => ({}), computeAlerts: () => alerts, onNewAlert: () => {} });
  const first = monitor.checkNow();
  assert.equal(first.length, 2);
});

test("start() polls on an interval and stop() halts further checks", async () => {
  let calls = 0;
  const monitor = createGovernanceMonitor({
    getState: () => ({}),
    computeAlerts: () => {
      calls += 1;
      return [];
    },
    intervalMs: 15,
  });
  monitor.start();
  await new Promise((resolve) => setTimeout(resolve, 70));
  monitor.stop();
  const callsAtStop = calls;
  assert.ok(callsAtStop >= 3, `expected at least 3 polls, got ${callsAtStop}`);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(calls, callsAtStop, "no further polls should happen after stop()");
});

test("checkNow() does not throw and returns an empty array when getState/computeAlerts are missing", () => {
  const monitor = createGovernanceMonitor({});
  assert.doesNotThrow(() => {
    const result = monitor.checkNow();
    assert.deepEqual(result, []);
  });
});
