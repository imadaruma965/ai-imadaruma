const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeFinanceSnapshot, normalizeFinanceSnapshot } = require("./finance-board.js");

test("finance snapshot: sample numbers match hand calculation", () => {
  const r = computeFinanceSnapshot({
    currentBalance: 100000,
    confirmedInflow: 50000,
    expectedInflow: 39800,
    fixedCosts: 80000,
    variableCosts: 20000,
    scheduledPayments: 30000,
    defenseLine: 100000,
  });
  // 100000+50000+39800-80000-20000-30000 = 59800
  assert.equal(r.projectedMonthEnd, 59800);
  // max(100000-59800, 0) = 40200
  assert.equal(r.shortfall, 40200);
  assert.equal(r.neededRevenue, 40200);
  // 500000 - (50000+39800) = 410200
  assert.equal(r.gapToMonthlyTarget, 410200);
});

test("finance snapshot: surplus yields shortfall 0", () => {
  const r = computeFinanceSnapshot({
    currentBalance: 200000,
    confirmedInflow: 0,
    expectedInflow: 0,
    fixedCosts: 10000,
    variableCosts: 0,
    scheduledPayments: 0,
    defenseLine: 50000,
  });
  assert.equal(r.projectedMonthEnd, 190000);
  assert.equal(r.shortfall, 0);
});

test("normalizeFinanceSnapshot coerces empty to null", () => {
  const s = normalizeFinanceSnapshot({ currentBalance: "", note: "x" });
  assert.equal(s.currentBalance, null);
  assert.equal(s.note, "x");
});
