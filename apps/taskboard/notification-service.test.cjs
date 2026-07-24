const test = require("node:test");
const assert = require("node:assert/strict");
const { NotificationService } = require("./notification-service.js");

test("notify() is a no-op stub that returns ok without throwing", () => {
  const result = NotificationService.notify({ title: "テスト警報" });
  assert.equal(result.ok, true);
  assert.equal(result.stub, true);
});

test("schedule() is a no-op stub that echoes back the payload and time", () => {
  const result = NotificationService.schedule({ title: "テスト" }, "2026-07-25T09:00:00.000Z");
  assert.equal(result.ok, true);
  assert.equal(result.whenISO, "2026-07-25T09:00:00.000Z");
});

test("cancel() is a no-op stub that echoes back the id", () => {
  const result = NotificationService.cancel("abc123");
  assert.equal(result.ok, true);
  assert.equal(result.scheduleId, "abc123");
});
