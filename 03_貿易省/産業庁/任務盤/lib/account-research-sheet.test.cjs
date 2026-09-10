const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCsv,
  usernameFromRow,
  usernamesFromSheetValues,
  filterNewRows,
  recomputeRatio,
} = require("./account-research-sheet.cjs");

test("parseCsv handles quotes and newlines in cells", () => {
  const rows = parseCsv('a,b\n"x,y","line1\nline2"\n');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["a", "b"]);
  assert.equal(rows[1][0], "x,y");
  assert.equal(rows[1][1], "line1\nline2");
});

test("usernameFromRow prefers username column then URL", () => {
  assert.equal(usernameFromRow(["", "", "", "Jerry_AI00", ""]), "jerry_ai00");
  assert.equal(
    usernameFromRow(["", "", "", "", "https://www.instagram.com/sakisns_ad/"]),
    "sakisns_ad"
  );
});

test("filterNewRows skips existing usernames", () => {
  const data = [
    ["AI", "A", "bio", "aaa", "https://instagram.com/aaa", "10", "2", "", "g", "reel", "2026/07/29"],
    ["AI", "B", "bio", "bbb", "https://instagram.com/bbb", "20", "4", "", "g", "reel", "2026/07/29"],
  ];
  const { toAppend, skipped } = filterNewRows(data, new Set(["aaa"]));
  assert.deepEqual(skipped, ["aaa"]);
  assert.equal(toAppend.length, 1);
  assert.equal(toAppend[0][3], "bbb");
  assert.equal(toAppend[0][7], "500"); // 20/4*100
});

test("usernamesFromSheetValues reads col D / URL (skips header)", () => {
  const set = usernamesFromSheetValues([
    ["ジャンル", "名前", "bio", "user", "url"],
    ["ビジネス系", "レン", "x", "ren_works081", "https://instagram.com/ren_works081"],
  ]);
  assert.equal(set.has("user"), false);
  assert.ok(set.has("ren_works081"));
});

test("recomputeRatio pads to 13 cols and uses x100", () => {
  const row = recomputeRatio(["g", "n", "p", "u", "url", "100", "4"]);
  assert.equal(row.length, 13);
  assert.equal(row[7], "2500");
});
