const test = require("node:test");
const assert = require("node:assert/strict");
const importer = require("../import-x-native.cjs");

test("X公式エクスポートの1行をX投稿レコードへ変換できる", () => {
  const row = [
    "123", "Thu, Nov 19, 2026", "本文テキスト", "https://x.com/u/status/123",
    "100", "5", "8", "1", "0", "2", "1", "0", "3", "4", "6", "0", "0",
  ];
  const { url, date, record } = importer.nativeRowToXRecord(row);
  assert.equal(url, "https://x.com/u/status/123");
  assert.equal(date, "2026-11-19");
  assert.equal(record["投稿日"], "2026-11-19");
  assert.equal(record["インプレッション_72h"], "100");
  assert.equal(record["いいね_72h"], "5");
  assert.equal(record["フォロー獲得数_72h"], "2");
  assert.equal(record["リンククリック_72h"], "6");
  assert.equal(record["インプレッション_24h"], "");
  assert.equal(record["発信ジャンル"].length, 0);
});

test("URLが空なら変換結果のurlも空になる", () => {
  const row = ["1", "Thu, Nov 19, 2026", "本文", "", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
  const { url } = importer.nativeRowToXRecord(row);
  assert.equal(url, "");
});
