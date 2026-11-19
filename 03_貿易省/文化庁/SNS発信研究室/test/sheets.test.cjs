const test = require("node:test");
const assert = require("node:assert/strict");
const sheets = require("../lib/sheets.cjs");

test("columnLetterは26列を超える列もA1記法に変換できる", () => {
  assert.equal(sheets.columnLetter(0), "A");
  assert.equal(sheets.columnLetter(25), "Z");
  assert.equal(sheets.columnLetter(26), "AA");
  assert.equal(sheets.columnLetter(34), "AI"); // X_COLUMNS相当の35列目
});
