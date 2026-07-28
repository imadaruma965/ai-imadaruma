// 営業・案件パイプラインの正規化・集計・フィルター・並び替え（ルールベース、純粋関数のみ）。
// ブラウザ（<script src="sales-pipeline.js">）とNode（node:test）の両方から使えるよう、依存を持たない実装にする。

(function (root) {
  const SALES_STATUSES = [
    "candidate",
    "contacted",
    "applied",
    "replied",
    "meeting",
    "proposal",
    "won",
    "lost",
    "paused",
  ];

  const STATUS_LABELS = {
    candidate: "候補",
    contacted: "接触済み",
    applied: "応募済み",
    replied: "返信あり",
    meeting: "面談",
    proposal: "提案・見積",
    won: "受注",
    lost: "失注",
    paused: "保留",
  };

  const PROPOSAL_TYPES = ["heavy", "light", "followup"];

  const PROPOSAL_TYPE_LABELS = {
    heavy: "本提案",
    light: "軽提案",
    followup: "追客",
  };

  const DAILY_SALES_TARGETS = { heavy: 20, light: 20, followup: 10 };

  const INVOICE_STATUSES = ["not_required", "not_issued", "issued"];
  const PAYMENT_STATUSES = ["unpaid", "paid"];

  const OPEN_PIPELINE_STATUSES = SALES_STATUSES.filter((s) => s !== "won" && s !== "lost");

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function isoFromDate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function todayISO(now) {
    return isoFromDate(now instanceof Date ? now : new Date());
  }

  function isIsoDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function localDateFromIso(isoString) {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? "" : isoFromDate(d);
  }

  function fallbackId() {
    return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeSalesRecord(raw, opts = {}) {
    const r = raw && typeof raw === "object" ? raw : {};
    const nowIso = new Date().toISOString();
    const status = SALES_STATUSES.includes(r.status) ? r.status : "candidate";
    const proposalType = PROPOSAL_TYPES.includes(r.proposalType) ? r.proposalType : "light";
    const invoiceStatus = INVOICE_STATUSES.includes(r.invoiceStatus) ? r.invoiceStatus : "not_required";
    const paymentStatus = PAYMENT_STATUSES.includes(r.paymentStatus) ? r.paymentStatus : "unpaid";
    const toAmount = (v) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return {
      id: r.id || (typeof opts.uid === "function" ? opts.uid() : fallbackId()),
      companyName: String(r.companyName || "").trim(),
      contactName: String(r.contactName || "").trim(),
      channel: String(r.channel || "").trim(),
      service: String(r.service || "").trim(),
      status,
      proposalType,
      estimatedAmount: toAmount(r.estimatedAmount),
      nextAction: String(r.nextAction || "").trim(),
      nextActionDate: isIsoDate(r.nextActionDate) ? r.nextActionDate : null,
      lastContactDate: isIsoDate(r.lastContactDate) ? r.lastContactDate : null,
      sourceUrl: String(r.sourceUrl || "").trim(),
      memo: String(r.memo || "").trim(),
      agreedAmount: toAmount(r.agreedAmount),
      deliveryDate: isIsoDate(r.deliveryDate) ? r.deliveryDate : null,
      invoiceStatus,
      paymentStatus,
      createdAt: r.createdAt || nowIso,
      updatedAt: r.updatedAt || nowIso,
    };
  }

  function isOverdueRecord(record, today) {
    if (!record || !record.nextActionDate) return false;
    if (record.status === "won" || record.status === "lost") return false;
    return record.nextActionDate < today;
  }

  function isDueTodayRecord(record, today) {
    if (!record || !record.nextActionDate) return false;
    if (record.status === "won" || record.status === "lost") return false;
    return record.nextActionDate === today;
  }

  function summarizeSalesPipeline(records, opts = {}) {
    const list = Array.isArray(records) ? records : [];
    const today = todayISO(opts.now);
    const counts = Object.fromEntries(SALES_STATUSES.map((s) => [s, 0]));
    let estimatedTotal = 0;
    let overdueCount = 0;
    let unbilledWonCount = 0;
    list.forEach((raw) => {
      const r = normalizeSalesRecord(raw);
      if (counts[r.status] != null) counts[r.status] += 1;
      if (OPEN_PIPELINE_STATUSES.includes(r.status) && r.estimatedAmount) {
        estimatedTotal += Number(r.estimatedAmount) || 0;
      }
      if (isOverdueRecord(r, today)) overdueCount += 1;
      if (r.status === "won" && r.invoiceStatus !== "issued") unbilledWonCount += 1;
    });
    return {
      ...counts,
      total: list.length,
      estimatedTotal,
      overdueCount,
      unbilledWonCount,
    };
  }

  function filterSalesPipeline(records, filters = {}, opts = {}) {
    const list = Array.isArray(records) ? records : [];
    const today = todayISO(opts.now);
    return list.filter((raw) => {
      const r = normalizeSalesRecord(raw);
      if (filters.status && r.status !== filters.status) return false;
      if (filters.channel && r.channel !== filters.channel) return false;
      if (filters.proposalType && r.proposalType !== filters.proposalType) return false;
      if (filters.overdueOnly && !isOverdueRecord(r, today)) return false;
      if (filters.todayOnly && !isDueTodayRecord(r, today)) return false;
      return true;
    });
  }

  function bucketOf(record, today) {
    if (isOverdueRecord(record, today)) return 0;
    if (isDueTodayRecord(record, today)) return 1;
    if (record.nextActionDate) return 2;
    return 3;
  }

  function sortSalesPipeline(records, opts = {}) {
    const list = Array.isArray(records) ? records.slice() : [];
    const today = todayISO(opts.now);
    return list.sort((rawA, rawB) => {
      const a = normalizeSalesRecord(rawA);
      const b = normalizeSalesRecord(rawB);
      const ba = bucketOf(a, today);
      const bb = bucketOf(b, today);
      if (ba !== bb) return ba - bb;
      if (ba === 2) {
        const cmp = String(a.nextActionDate).localeCompare(String(b.nextActionDate));
        if (cmp !== 0) return cmp;
      }
      return String(a.companyName || "").localeCompare(String(b.companyName || ""), "ja");
    });
  }

  function calculateDailySalesActions(records, dateISO, opts = {}) {
    const date = isIsoDate(dateISO) ? dateISO : todayISO(opts.now);
    const list = Array.isArray(records) ? records : [];
    const counts = { heavy: 0, light: 0, followup: 0 };
    list.forEach((raw) => {
      const r = normalizeSalesRecord(raw);
      const touchedToday =
        r.lastContactDate === date || (!r.lastContactDate && localDateFromIso(r.createdAt) === date);
      if (!touchedToday) return;
      if (counts[r.proposalType] != null) counts[r.proposalType] += 1;
    });
    const total = counts.heavy + counts.light + counts.followup;
    return {
      ...counts,
      total,
      targets: { ...DAILY_SALES_TARGETS, total: DAILY_SALES_TARGETS.heavy + DAILY_SALES_TARGETS.light + DAILY_SALES_TARGETS.followup },
    };
  }

  function buildHomeSalesSummary(records, opts = {}) {
    const list = Array.isArray(records) ? records : [];
    const today = todayISO(opts.now);
    const daily = calculateDailySalesActions(list, today, opts);
    const overdueCount = list.filter((raw) => isOverdueRecord(normalizeSalesRecord(raw), today)).length;
    const todayCount = list.filter((raw) => isDueTodayRecord(normalizeSalesRecord(raw), today)).length;
    const meetingCount = list.filter((raw) => normalizeSalesRecord(raw).status === "meeting").length;
    const unbilledWonCount = list.filter((raw) => {
      const r = normalizeSalesRecord(raw);
      return r.status === "won" && r.invoiceStatus !== "issued";
    }).length;
    return { daily, overdueCount, todayCount, meetingCount, unbilledWonCount };
  }

  const api = {
    SALES_STATUSES,
    STATUS_LABELS,
    PROPOSAL_TYPES,
    PROPOSAL_TYPE_LABELS,
    DAILY_SALES_TARGETS,
    INVOICE_STATUSES,
    PAYMENT_STATUSES,
    normalizeSalesRecord,
    localDateFromIso,
    isOverdueRecord,
    isDueTodayRecord,
    summarizeSalesPipeline,
    filterSalesPipeline,
    sortSalesPipeline,
    calculateDailySalesActions,
    buildHomeSalesSummary,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.TaskboardSales = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
