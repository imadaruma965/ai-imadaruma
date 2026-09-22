const test = require("node:test");
const assert = require("node:assert/strict");
const { NotificationService } = require("./notification-service.js");

function withFakeNotification(permission, fn) {
  let created = [];
  class FakeNotification {
    constructor(title, options) {
      created.push({ title, ...options });
    }
  }
  FakeNotification.permission = permission;
  FakeNotification.requestPermission = () => {
    FakeNotification.requestPermissionCalled = true;
    return Promise.resolve(permission);
  };
  global.Notification = FakeNotification;
  try {
    fn(FakeNotification, () => created);
  } finally {
    delete global.Notification;
  }
}

test("notify() falls back to a stub when the Notification API is unavailable (no window)", () => {
  const result = NotificationService.notify({ title: "テスト警報", message: "本文" });
  assert.equal(result.ok, true);
  assert.equal(result.method, "stub");
});

test("notify() sends a real browser notification when permission is granted", () => {
  withFakeNotification("granted", (FakeNotification, getCreated) => {
    const result = NotificationService.notify({ type: "overdue_tasks_exist", title: "期限超過", message: "1件あります" });
    assert.equal(result.ok, true);
    assert.equal(result.method, "browser-notification");
    const created = getCreated();
    assert.equal(created.length, 1);
    assert.equal(created[0].title, "期限超過");
    assert.equal(created[0].body, "1件あります");
    assert.equal(created[0].tag, "overdue_tasks_exist");
  });
});

test("notify() requests permission when it has not been decided yet", () => {
  withFakeNotification("default", (FakeNotification) => {
    const result = NotificationService.notify({ title: "テスト" });
    assert.equal(result.ok, true);
    assert.equal(result.method, "permission-requested");
    assert.equal(FakeNotification.requestPermissionCalled, true);
  });
});

test("notify() does not send anything when permission was denied", () => {
  withFakeNotification("denied", (FakeNotification, getCreated) => {
    const result = NotificationService.notify({ title: "テスト" });
    assert.equal(result.ok, false);
    assert.equal(result.method, "denied");
    assert.equal(getCreated().length, 0);
  });
});

test("schedule() remains a no-op stub (time-based scheduling is out of scope for Phase 3-A)", () => {
  const result = NotificationService.schedule({ title: "テスト" }, "2026-07-25T09:00:00.000Z");
  assert.equal(result.ok, true);
  assert.equal(result.whenISO, "2026-07-25T09:00:00.000Z");
});

test("cancel() remains a no-op stub", () => {
  const result = NotificationService.cancel("abc123");
  assert.equal(result.ok, true);
  assert.equal(result.scheduleId, "abc123");
});
