// 通知サービスのインターフェースのみ（Phase 2-1）。実通知（Mac/スマホ/LINE）は次Phase以降。
// notify()/schedule()/cancel() は console.log のみで、副作用を持たない。

(function (root) {
  const NotificationService = {
    notify(payload) {
      console.log("[NotificationService.notify] スタブ実装（実通知なし）", payload);
      return { ok: true, stub: true, payload };
    },
    schedule(payload, whenISO) {
      console.log("[NotificationService.schedule] スタブ実装（スケジュールなし）", payload, whenISO);
      return { ok: true, stub: true, payload, whenISO };
    },
    cancel(scheduleId) {
      console.log("[NotificationService.cancel] スタブ実装（取消対象なし）", scheduleId);
      return { ok: true, stub: true, scheduleId };
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { NotificationService };
  }
  if (typeof window !== "undefined") {
    window.NotificationService = NotificationService;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
