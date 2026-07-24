// 60秒ごとに getGovernanceAlerts() を実行し、直前のチェックには無かった新規警報のみを
// onNewAlert へ渡す監視ループ（Phase 3-A）。state.jsonへは何も保存しない（派生・非永続）。

(function (root) {
  function alertKey(alert) {
    return `${alert.type}:${alert.relatedEntityId || ""}`;
  }

  function createGovernanceMonitor({ getState, computeAlerts, onNewAlert, now, intervalMs } = {}) {
    const period = intervalMs || 60000;
    let previousKeys = new Set();
    let timer = null;

    function checkNow() {
      if (typeof getState !== "function" || typeof computeAlerts !== "function") return [];
      const state = getState();
      const nowValue = typeof now === "function" ? now() : new Date();
      const alerts = computeAlerts(state, { now: nowValue }) || [];
      const currentKeys = new Set(alerts.map(alertKey));
      const newAlerts = alerts.filter((a) => !previousKeys.has(alertKey(a)));
      previousKeys = currentKeys;
      if (newAlerts.length && typeof onNewAlert === "function") {
        newAlerts.forEach((alert) => onNewAlert(alert));
      }
      return newAlerts;
    }

    function start() {
      if (timer) return;
      checkNow();
      timer = setInterval(checkNow, period);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    return { start, stop, checkNow };
  }

  const api = { createGovernanceMonitor };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.GovernanceMonitor = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
