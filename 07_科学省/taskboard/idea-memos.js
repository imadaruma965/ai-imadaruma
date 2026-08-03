// アイデアメモ（日付のない思いつき）。parking_lot のアプリ側器。
// ブラウザと Node test の両方から使える純粋関数。

(function (root) {
  const STATUSES = ["open", "archived"];
  const SOURCES = ["manual", "cabinet", "smart_rabbit", "sontoku", "voice", "other"];

  function fallbackId() {
    return `im-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeIdeaMemo(raw, opts = {}) {
    const r = raw && typeof raw === "object" ? raw : {};
    const nowIso = new Date().toISOString();
    const text = String(r.text || "").trim();
    const status = STATUSES.includes(r.status) ? r.status : "open";
    const source = SOURCES.includes(r.source) ? r.source : "manual";
    return {
      id: typeof r.id === "string" && r.id ? r.id : opts.uid ? opts.uid() : fallbackId(),
      text,
      source,
      sourceMember: typeof r.sourceMember === "string" ? r.sourceMember : "",
      createdAt: typeof r.createdAt === "string" && r.createdAt ? r.createdAt : nowIso,
      updatedAt: typeof r.updatedAt === "string" && r.updatedAt ? r.updatedAt : nowIso,
      status,
    };
  }

  function createIdeaMemo(text, opts = {}) {
    const nowIso = new Date().toISOString();
    return normalizeIdeaMemo(
      {
        text,
        source: opts.source || "manual",
        sourceMember: opts.sourceMember || "",
        createdAt: nowIso,
        updatedAt: nowIso,
        status: "open",
      },
      opts
    );
  }

  function listOpenIdeaMemos(list) {
    return (Array.isArray(list) ? list : [])
      .map((m) => normalizeIdeaMemo(m))
      .filter((m) => m.status === "open" && m.text)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function titleFromMemoText(text) {
    const line = String(text || "")
      .trim()
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    if (!line) return "アイデアメモ";
    return line.length > 60 ? `${line.slice(0, 57)}…` : line;
  }

  const api = {
    STATUSES,
    SOURCES,
    normalizeIdeaMemo,
    createIdeaMemo,
    listOpenIdeaMemos,
    titleFromMemoText,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.TaskboardIdeaMemos = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
