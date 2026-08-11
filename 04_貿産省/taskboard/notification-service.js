// 通知サービス（Phase 3-A）。notify() は Browser Notification API に接続済み。
// schedule()/cancel() は時刻指定の予約が未使用のため、引き続きインターフェースのみ（Phase 2-1のまま）。

(function (root) {
  const NotificationService = {
    notify(payload) {
      const title = (payload && payload.title) || "統治手帳";
      const body = (payload && payload.message) || "";
      const tag = (payload && payload.type) || undefined;

      if (typeof Notification === "undefined") {
        console.log("[NotificationService.notify] Notification API未対応、スタブ実行", payload);
        return { ok: true, method: "stub", payload };
      }
      if (Notification.permission === "granted") {
        new Notification(title, { body, tag });
        return { ok: true, method: "browser-notification", payload };
      }
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") new Notification(title, { body, tag });
        });
        return { ok: true, method: "permission-requested", payload };
      }
      console.log("[NotificationService.notify] 通知許可が拒否されています", payload);
      return { ok: false, method: "denied", payload };
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
