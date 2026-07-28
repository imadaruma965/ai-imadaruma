// 財政スナップショットの正規化・計算（純粋関数のみ）。
// finance_board.md の必須計算とキングダムOS月次入力を接続する。

(function (root) {
  const MONTHLY_REVENUE_TARGET = 500000;

  function toAmount(v) {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function amountOrZero(v) {
    const n = toAmount(v);
    return n == null ? 0 : n;
  }

  function normalizeFinanceSnapshot(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    return {
      currentBalance: toAmount(r.currentBalance),
      confirmedInflow: toAmount(r.confirmedInflow),
      expectedInflow: toAmount(r.expectedInflow),
      fixedCosts: toAmount(r.fixedCosts),
      variableCosts: toAmount(r.variableCosts),
      scheduledPayments: toAmount(r.scheduledPayments),
      defenseLine: toAmount(r.defenseLine),
      note: String(r.note || ""),
    };
  }

  function computeFinanceSnapshot(raw, opts = {}) {
    const s = normalizeFinanceSnapshot(raw);
    const projectedMonthEnd =
      amountOrZero(s.currentBalance) +
      amountOrZero(s.confirmedInflow) +
      amountOrZero(s.expectedInflow) -
      amountOrZero(s.fixedCosts) -
      amountOrZero(s.variableCosts) -
      amountOrZero(s.scheduledPayments);
    const defense = amountOrZero(s.defenseLine);
    const shortfall = Math.max(defense - projectedMonthEnd, 0);
    const neededRevenue = shortfall;
    const bookedInflow = amountOrZero(s.confirmedInflow) + amountOrZero(s.expectedInflow);
    const target = opts.monthlyTarget != null ? Number(opts.monthlyTarget) : MONTHLY_REVENUE_TARGET;
    const gapToMonthlyTarget = target - bookedInflow;
    return {
      ...s,
      projectedMonthEnd,
      shortfall,
      neededRevenue,
      gapToMonthlyTarget,
      monthlyTarget: target,
      bookedInflow,
    };
  }

  const api = {
    MONTHLY_REVENUE_TARGET,
    normalizeFinanceSnapshot,
    computeFinanceSnapshot,
    toAmount,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.TaskboardFinance = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
