const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeSalesRecord,
  localDateFromIso,
  summarizeSalesPipeline,
  filterSalesPipeline,
  sortSalesPipeline,
  calculateDailySalesActions,
  buildHomeSalesSummary,
} = require("./sales-pipeline.js");

function withTZ(tz, fn) {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

test("salesPipelineがない旧stateの正規化: undefined/nullを渡しても例外にならず空扱いになる", () => {
  assert.deepEqual(filterSalesPipeline(undefined, {}), []);
  assert.deepEqual(filterSalesPipeline(null, {}), []);
  assert.deepEqual(sortSalesPipeline(undefined), []);
  const summary = summarizeSalesPipeline(undefined);
  assert.equal(summary.total, 0);
  assert.equal(summary.candidate, 0);
  assert.equal(summary.estimatedTotal, 0);
  assert.equal(summary.overdueCount, 0);
  const daily = calculateDailySalesActions(undefined, "2026-07-28");
  assert.equal(daily.total, 0);
});

test("営業レコードの正規化: 不正・欠落値をデフォルトへ丸め、文字列をtrimする", () => {
  const r = normalizeSalesRecord({
    companyName: "  A社  ",
    status: "not_a_status",
    proposalType: "not_a_type",
    estimatedAmount: "50000",
    nextActionDate: "invalid-date",
  });
  assert.equal(r.companyName, "A社");
  assert.equal(r.status, "candidate");
  assert.equal(r.proposalType, "light");
  assert.equal(r.estimatedAmount, 50000);
  assert.equal(r.nextActionDate, null);
  assert.equal(typeof r.id, "string");
  assert.ok(r.id.length > 0);
  assert.equal(r.invoiceStatus, "not_required");
  assert.equal(r.paymentStatus, "unpaid");
});

test("営業レコードの正規化: idが既にあれば保持し、estimatedAmountの空文字はnullになる", () => {
  const r = normalizeSalesRecord({ id: "sp-fixed", estimatedAmount: "" });
  assert.equal(r.id, "sp-fixed");
  assert.equal(r.estimatedAmount, null);
});

test("金額正規化: 変換できない値・null系はnullになり、正常な数値はNaNにならず保持される", () => {
  assert.equal(normalizeSalesRecord({ estimatedAmount: "abc" }).estimatedAmount, null);
  assert.equal(normalizeSalesRecord({ estimatedAmount: "" }).estimatedAmount, null);
  assert.equal(normalizeSalesRecord({ estimatedAmount: null }).estimatedAmount, null);
  assert.equal(normalizeSalesRecord({ estimatedAmount: undefined }).estimatedAmount, null);
  assert.equal(normalizeSalesRecord({ estimatedAmount: "10000" }).estimatedAmount, 10000);
  assert.equal(normalizeSalesRecord({ estimatedAmount: 25000 }).estimatedAmount, 25000);
  assert.equal(normalizeSalesRecord({ agreedAmount: "abc" }).agreedAmount, null);
  assert.equal(normalizeSalesRecord({ agreedAmount: "300000" }).agreedAmount, 300000);

  // NaN/Infinityがstateやレコードに一切残らないことを網羅的に確認する。
  ["abc", "", null, undefined, "10000", 25000, "Infinity", "-Infinity", "NaN"].forEach((v) => {
    const r = normalizeSalesRecord({ estimatedAmount: v, agreedAmount: v });
    assert.equal(Number.isNaN(r.estimatedAmount), false, `estimatedAmount(${v})はNaNであってはならない`);
    assert.equal(Number.isNaN(r.agreedAmount), false, `agreedAmount(${v})はNaNであってはならない`);
    assert.equal(r.estimatedAmount === null || Number.isFinite(r.estimatedAmount), true);
    assert.equal(r.agreedAmount === null || Number.isFinite(r.agreedAmount), true);
  });
});

test("ステータス別集計: summarizeSalesPipelineが各ステータス件数と見込売上合計を正しく数える", () => {
  const now = new Date("2026-07-28T09:00:00");
  const records = [
    { status: "candidate" },
    { status: "candidate" },
    { status: "meeting", estimatedAmount: 100000 },
    { status: "won", estimatedAmount: 200000 }, // wonは見込売上合計に含めない
    { status: "lost", estimatedAmount: 999999 }, // lostも含めない
  ];
  const summary = summarizeSalesPipeline(records, { now });
  assert.equal(summary.candidate, 2);
  assert.equal(summary.meeting, 1);
  assert.equal(summary.won, 1);
  assert.equal(summary.lost, 1);
  assert.equal(summary.total, 5);
  assert.equal(summary.estimatedTotal, 100000);
});

test("当日のheavy/light/followup集計: lastContactDateが当日の記録だけを区分別に数える", () => {
  const records = [
    { proposalType: "heavy", lastContactDate: "2026-07-28" },
    { proposalType: "heavy", lastContactDate: "2026-07-28" },
    { proposalType: "light", lastContactDate: "2026-07-27" }, // 前日なので数えない
    { proposalType: "followup", createdAt: "2026-07-28T03:00:00.000Z" }, // lastContactDate未設定はcreatedAtの日付で判定
    { proposalType: "light", createdAt: "2026-07-27T03:00:00.000Z" },
  ];
  const daily = calculateDailySalesActions(records, "2026-07-28");
  assert.equal(daily.heavy, 2);
  assert.equal(daily.light, 0);
  assert.equal(daily.followup, 1);
  assert.equal(daily.total, 3);
  assert.equal(daily.targets.heavy, 20);
  assert.equal(daily.targets.light, 20);
  assert.equal(daily.targets.followup, 10);
  assert.equal(daily.targets.total, 50);
});

test("localDateFromIso: UTCのslice(0,10)ではなく、ローカル日付を返す（TZ依存を明示的に固定して検証）", () => {
  withTZ("Asia/Tokyo", () => {
    // 2026-07-28T15:30:00.000Z はJST(UTC+9)では2026-07-29 00:30。
    // 単純な文字列slice(0,10)なら"2026-07-28"のままだが、ローカル日付変換では"2026-07-29"になるはず。
    assert.equal(localDateFromIso("2026-07-28T15:30:00.000Z"), "2026-07-29");
    assert.notEqual(localDateFromIso("2026-07-28T15:30:00.000Z"), "2026-07-28T15:30:00.000Z".slice(0, 10));
  });
  withTZ("America/Los_Angeles", () => {
    // 同じ瞬間でもタイムゾーンが変われば結果も変わる（=UTC固定のsliceではない証拠）。
    assert.equal(localDateFromIso("2026-07-28T15:30:00.000Z"), "2026-07-28");
  });
});

test("localDateFromIso: 不正なcreatedAtは例外を出さず空文字になる", () => {
  assert.equal(localDateFromIso("not-a-date"), "");
  assert.equal(localDateFromIso(""), "");
  assert.equal(localDateFromIso(undefined), "");
});

test("当日集計: JSTなどUTCより進んだタイムゾーンでも、現地時間で当日作成した案件がlastContactDate未設定でも当日集計に含まれる", () => {
  withTZ("Asia/Tokyo", () => {
    // 現地時刻2026-07-29 00:30(JST)に作成 = UTCでは2026-07-28T15:30:00.000Z。
    // 修正前はcreatedAtのUTC日付("2026-07-28")で判定され、当日("2026-07-29")の集計から漏れていた。
    const records = [{ proposalType: "heavy", createdAt: "2026-07-28T15:30:00.000Z" }];
    const localNow = new Date("2026-07-28T15:30:00.000Z");
    const daily = calculateDailySalesActions(records, undefined, { now: localNow });
    assert.equal(daily.heavy, 1);
    assert.equal(daily.total, 1);
  });
});

test("当日集計: 不正なcreatedAtでも例外を出さず、当日扱いにもならない", () => {
  const records = [{ proposalType: "light", createdAt: "not-a-date" }];
  assert.doesNotThrow(() => calculateDailySalesActions(records, "2026-07-28"));
  const daily = calculateDailySalesActions(records, "2026-07-28");
  assert.equal(daily.light, 0);
  assert.equal(daily.total, 0);
});

test("当日集計: lastContactDateがある場合は、createdAtの日付にかかわらずそちらを優先する", () => {
  withTZ("Asia/Tokyo", () => {
    const records = [
      {
        proposalType: "followup",
        lastContactDate: "2026-07-28",
        createdAt: "2020-01-01T00:00:00.000Z", // 大きく異なる作成日でも無視される
      },
      {
        proposalType: "followup",
        lastContactDate: "2026-07-27", // 前日指定なので当日には数えない
        createdAt: "2026-07-28T15:30:00.000Z",
      },
    ];
    const daily = calculateDailySalesActions(records, "2026-07-28");
    assert.equal(daily.followup, 1);
  });
});

test("期限超過判定: nextActionDateが過去かつwon/lost以外のときだけ超過扱いになる", () => {
  const now = new Date("2026-07-28T09:00:00");
  const records = [
    { id: "a", status: "candidate", nextActionDate: "2026-07-20" }, // 超過
    { id: "b", status: "candidate", nextActionDate: "2026-08-01" }, // 未来
    { id: "c", status: "won", nextActionDate: "2026-07-01" }, // wonは超過扱いにしない
    { id: "d", status: "candidate", nextActionDate: null }, // 日付なしは超過にならない
  ];
  const summary = summarizeSalesPipeline(records, { now });
  assert.equal(summary.overdueCount, 1);
  const overdueOnly = filterSalesPipeline(records, { overdueOnly: true }, { now });
  assert.deepEqual(overdueOnly.map((r) => r.id), ["a"]);
});

test("並び順: 期限超過 → 本日対応 → 直近日付(昇順) → 日付未設定 の順になる", () => {
  const now = new Date("2026-07-28T09:00:00");
  const records = [
    { id: "no-date", companyName: "Z社", nextActionDate: null },
    { id: "future-late", companyName: "Y社", nextActionDate: "2026-08-05" },
    { id: "overdue", companyName: "X社", nextActionDate: "2026-07-20" },
    { id: "today", companyName: "W社", nextActionDate: "2026-07-28" },
    { id: "future-soon", companyName: "V社", nextActionDate: "2026-08-01" },
  ];
  const sorted = sortSalesPipeline(records, { now });
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["overdue", "today", "future-soon", "future-late", "no-date"]
  );
});

test("won案件の金額・請求・入金状態: normalizeSalesRecordが受注フィールドを保持・既定化する", () => {
  const won = normalizeSalesRecord({
    status: "won",
    agreedAmount: "300000",
    deliveryDate: "2026-08-15",
    invoiceStatus: "issued",
    paymentStatus: "paid",
  });
  assert.equal(won.agreedAmount, 300000);
  assert.equal(won.deliveryDate, "2026-08-15");
  assert.equal(won.invoiceStatus, "issued");
  assert.equal(won.paymentStatus, "paid");

  const wonDefaults = normalizeSalesRecord({ status: "won" });
  assert.equal(wonDefaults.agreedAmount, null);
  assert.equal(wonDefaults.invoiceStatus, "not_required");
  assert.equal(wonDefaults.paymentStatus, "unpaid");

  const invalidStatuses = normalizeSalesRecord({ status: "won", invoiceStatus: "bogus", paymentStatus: "bogus" });
  assert.equal(invalidStatuses.invoiceStatus, "not_required");
  assert.equal(invalidStatuses.paymentStatus, "unpaid");
});

test("buildHomeSalesSummary: 期限超過・本日対応・面談予定・未請求受注を正しく数える", () => {
  const now = new Date("2026-07-28T09:00:00");
  const records = [
    { status: "candidate", nextActionDate: "2026-07-20" }, // overdue
    { status: "candidate", nextActionDate: "2026-07-28" }, // today
    { status: "meeting", nextActionDate: "2026-08-01" },
    { status: "won", invoiceStatus: "not_issued" }, // unbilled
    { status: "won", invoiceStatus: "issued" }, // billed, not counted
  ];
  const s = buildHomeSalesSummary(records, { now });
  assert.equal(s.overdueCount, 1);
  assert.equal(s.todayCount, 1);
  assert.equal(s.meetingCount, 1);
  assert.equal(s.unbilledWonCount, 1);
});

test("営業レコードの正規化: winProbability は 0-100 に丸め、空は null", () => {
  assert.equal(normalizeSalesRecord({ winProbability: 50 }).winProbability, 50);
  assert.equal(normalizeSalesRecord({ winProbability: "" }).winProbability, null);
  assert.equal(normalizeSalesRecord({ winProbability: 150 }).winProbability, 100);
  assert.equal(normalizeSalesRecord({ winProbability: -5 }).winProbability, 0);
});

test("確度加重売上: open案件のみ見込み×確度/100", () => {
  const summary = summarizeSalesPipeline(
    [
      { status: "meeting", estimatedAmount: 100000, winProbability: 50 },
      { status: "won", estimatedAmount: 200000, winProbability: 100 },
      { status: "lost", estimatedAmount: 999999, winProbability: 100 },
    ],
    { now: new Date("2026-07-28T12:00:00") }
  );
  assert.equal(summary.estimatedTotal, 100000);
  assert.equal(summary.weightedEstimatedTotal, 50000);
});
