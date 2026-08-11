const test = require("node:test");
const assert = require("node:assert/strict");
const oauth = require("./google-oauth.cjs");

test("google-oauth exposes Calendar + Sheets scopes", () => {
  assert.ok(oauth.SCOPES.some((s) => s.includes("calendar")));
  assert.ok(oauth.SCOPES.some((s) => s.includes("spreadsheets")));
});

test("hasSheetsScope detects spreadsheets scope string", () => {
  assert.equal(
    oauth.hasSheetsScope({
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets",
    }),
    true
  );
  assert.equal(
    oauth.hasSheetsScope({
      scope: "https://www.googleapis.com/auth/calendar.events",
    }),
    false
  );
});
