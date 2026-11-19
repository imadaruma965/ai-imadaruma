const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../lib/core.cjs");
const csv = require("../lib/csv.cjs");

test("複数選択フィールドは「；」で分割・結合できる", () => {
  assert.deepEqual(core.splitMulti("行動；お金； 時間"), ["行動", "お金", "時間"]);
  assert.equal(core.joinMulti(["行動", "お金"]), "行動；お金");
  assert.equal(core.splitMulti("").length, 0);
});

test("曜日は投稿日から自動算出される", () => {
  assert.equal(core.deriveWeekday("2026-11-19"), "木");
});

test("Xレコードは行列とオブジェクトを往復できる", () => {
  const record = {
    "投稿日": "2026-11-19", "投稿時刻": "09:00", "投稿URL": "https://x.com/u/status/1",
    "冒頭3行のフック": "フック", "投稿全文": "本文テキスト", "発信ジャンル": ["行動", "お金"],
    "投稿テーマ": "テーマ", "損失の種類": ["時間的損失"], "投稿形式": "箇条書き",
    "フックの種類": "具体的な数字", "複眼設計の種類": ["心理学", "実体験"],
    "実体験の有無": "○", "画像の有無": "○", "外部リンクの有無": "×", "投稿の目的": "送客",
    "インプレッション_24h": 1000, "いいね_24h": 50,
  };
  const row = core.xRowFromRecord(record);
  assert.equal(row.length, core.X_COLUMNS.length);
  const back = core.xRecordFromRow(row);
  assert.deepEqual(back["発信ジャンル"], ["行動", "お金"]);
  assert.equal(back["インプレッション_24h"], 1000);
  assert.equal(back["いいね_24h"], 50);
  assert.equal(back["リポスト_24h"], null);
  assert.equal(row[core.X_COLUMNS.indexOf("曜日")], "木");
  assert.equal(row[core.X_COLUMNS.indexOf("文字数")], 6);
});

test("共感率などの比率は欠損時nullになる", () => {
  const r1 = core.computeXRates({ "インプレッション_72h": 1000, "いいね_72h": 50, "ブックマーク_72h": 10, "リポスト_72h": 5, "プロフィールアクセス_72h": 20, "フォロー獲得数_72h": 2, "リンククリック_72h": 8 }, "72h");
  assert.equal(r1.empathyRate, 0.05);
  assert.equal(r1.saveRate, 0.01);
  assert.equal(r1.followConversionRate, 0.1);
  const r2 = core.computeXRates({ "インプレッション_72h": 0 }, "72h");
  assert.equal(r2.empathyRate, null);
  const r3 = core.computeXRates({}, "72h");
  assert.equal(r3.empathyRate, null);
});

test("平均・中央値はnullを除外して計算する", () => {
  assert.equal(core.mean([10, 20, null, 30]), 20);
  assert.equal(core.median([1, 3, 2]), 2);
  assert.equal(core.median([]), null);
});

test("groupByは複数選択フィールドを各グループに割り振る", () => {
  const records = [
    { "発信ジャンル": ["行動", "お金"], v: 10 },
    { "発信ジャンル": ["お金"], v: 20 },
  ];
  const groups = core.groupBy(records, "発信ジャンル", { multi: true });
  assert.equal(groups.get("行動").length, 1);
  assert.equal(groups.get("お金").length, 2);
});

test("サンプル数が少ない集計にはlowSampleが付く", () => {
  const groups = new Map([["行動", [{ v: 1 }, { v: 2 }]]]);
  const summary = core.summarizeGroups(groups, (r) => r.v, 5);
  assert.equal(summary[0].lowSample, true);
  assert.equal(summary[0].mean, 1.5);
});

test("文字数バケットは設定順に最初に当たったものを採用する", () => {
  const buckets = [{ label: "短", max: 70 }, { label: "中", max: 140 }, { label: "長", max: null }];
  assert.equal(core.bucketLabel(50, buckets), "短");
  assert.equal(core.bucketLabel(100, buckets), "中");
  assert.equal(core.bucketLabel(999, buckets), "長");
});

test("ISO週キーは年をまたいでも一意になる", () => {
  assert.equal(core.isoWeekKey("2026-11-19"), "2026-W47");
  assert.notEqual(core.isoWeekKey("2026-01-01"), core.isoWeekKey("2026-12-31"));
});

test("CSVは引用符・埋め込み改行・カンマを往復できる", () => {
  const rows = [["a", "b,c", 'd"e', "f\ng"]];
  const text = csv.toCSV(rows);
  const parsed = csv.parseCSV(text);
  assert.deepEqual(parsed, rows);
});

test("noteレコードも行列を往復できる", () => {
  const record = { "記事タイトル": "タイトル", "記事URL": "https://note.com/u/n/1", "公開日": "2026-11-19", "ジャンル": "信頼", "無料・有料区分": "有料", "販売価格": 500, "売上": 1500, "販売数": 3 };
  const row = core.noteRowFromRecord(record);
  const back = core.noteRecordFromRow(row);
  assert.equal(back["売上"], 1500);
  assert.equal(back["販売数"], 3);
});
