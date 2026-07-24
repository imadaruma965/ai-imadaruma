(async () => {
  const STORAGE_KEY = "imadaruma-gyomu-tochi-v1";
  const TARGET_DATE = "2026-12-09";

  const DEFAULT_CATEGORIES = [
    { id: "fres", label: "フレスト" },
    { id: "lex", label: "レックス" },
    { id: "sound", label: "sound" },
    { id: "media", label: "発信" },
    { id: "write", label: "執筆" },
    { id: "ds", label: "DS" },
    { id: "design", label: "デザイン" },
    { id: "invest", label: "投資" },
    { id: "personal", label: "個人" },
    { id: "other", label: "その他" },
  ];

  const PRIORITIES = [
    { id: "uu", label: "今すぐ対応", hint: "急ぎで大事（締切・クレーム）", accent: false },
    { id: "un", label: "見せかけの急ぎ", hint: "急ぎだが大事でない → 任せる・まとめる", accent: false },
    { id: "nu", label: "大事・種まき", hint: "大事だが急がない → 毎日ひとつ", accent: true },
    { id: "nn", label: "減らす", hint: "急ぎでも大事でもない → 削る", accent: false },
  ];

  const POMO_WORK_MS = 25 * 60 * 1000;
  const POMO_BREAK_MS = 5 * 60 * 1000;

  // 現在値は君主入力。baseline / target は 12/9 統治目標（ご提示値）
  const BOARD_DEFS = {
    finance: [
      { id: "edu", label: "教育事業月収", unit: "yen", baseline: 0, target: 150000, current: 0 },
      { id: "prod", label: "制作事業月収", unit: "yen", baseline: 0, target: 300000, current: 0 },
      { id: "inv", label: "投資事業月収", unit: "yen", baseline: 0, target: 50000, current: 0 },
    ],
    diplomacy: [
      { id: "li", label: "LinkedInフォロワー", unit: "人", baseline: 1999, target: 5000, current: 1999 },
      { id: "nl_jp", label: "NL購読（日本）", unit: "人", baseline: 367, target: 1000, current: 367 },
      { id: "nl_en", label: "NL購読（英語）", unit: "人", baseline: 127, target: 300, current: 127 },
      { id: "line", label: "LINE公式", unit: "人", baseline: 41, target: 300, current: 41 },
      { id: "ss", label: "Substack", unit: "人", baseline: 0, target: 200, current: 0 },
      { id: "ig", label: "Instagram @imadaruma_sound", unit: "人", baseline: 14, target: 1000, current: 14 },
      { id: "yt", label: "YouTube", unit: "人", baseline: 30, target: 300, current: 30 },
      { id: "reed", label: "Reed Blade会員", unit: "人", baseline: 0, target: 42, current: 0 },
      { id: "sound_orders", label: "sound月次受注", unit: "件/月", baseline: 0, target: 5, current: 0 },
    ],
    naisei: [
      { id: "weight", label: "体重", unit: "kg", baseline: 79.6, target: 72, current: 79.0, invert: true },
      { id: "waist", label: "腹囲", unit: "cm", baseline: 100, target: 85, current: null, invert: true },
      { id: "bf", label: "体脂肪率", unit: "%", baseline: 29.5, target: 20, current: 26.6, invert: true },
      { id: "gym", label: "筋トレ（週回数）", unit: "回", baseline: 1, target: 3, current: 1 },
    ],
  };

  // メディア戦略（火〜金カルーセル／日NL）。準備は2日前に強制。
  const MEDIA_FORCE = {
    2: {
      pub: "火・人格カルーセル 配信日",
      prep: "火・人格カルーセル 制作（配信2日前）",
      pubKey: "media-tue-pub",
      prepKey: "media-tue-prep",
    },
    3: {
      pub: "水・内政カルーセル 配信日",
      prep: "水・内政カルーセル 制作（配信2日前）",
      pubKey: "media-wed-pub",
      prepKey: "media-wed-prep",
    },
    4: {
      pub: "木・外交カルーセル 配信日",
      prep: "木・外交カルーセル 制作（配信2日前）",
      pubKey: "media-thu-pub",
      prepKey: "media-thu-prep",
    },
    5: {
      pub: "金・財政カルーセル 配信日",
      prep: "金・財政カルーセル 制作（配信2日前）",
      pubKey: "media-fri-pub",
      prepKey: "media-fri-prep",
    },
    0: {
      pub: "日・ニュースレター 配信日",
      prep: "日・NL制作（配信2日前＝金）",
      pubKey: "media-nl-pub",
      prepKey: "media-nl-prep",
      aliases: ["日曜日（ニュースレター）", "日曜ニュースレター", "日曜NL配信", "日曜日（ニュースレター配信）"],
    },
  };

  const MEDIA_CALENDAR = {
    0: ["NL公開・音声収録"],
    1: ["音源配布・解説・予約確認"],
    2: ["人格カルーセル（LI・FB・IG・X）"],
    3: ["内政カルーセル（LI・FB・IG・X）"],
    4: ["外交カルーセル（LI・FB・IG・X）"],
    5: ["財政カルーセル（LI・FB・IG・X）", "翌週カ4・NL下書き／統治ボード"],
    6: ["NL確認・火〜金投稿予約"],
  };

  const REQUIRED_MONTHLY = [
    { key: "fres-billing", category: "fres", day: 1, title: "請求案内" },
    { key: "fres-guardian", category: "fres", day: 3, title: "保護者案内" },
    { key: "fres-withdrawal", category: "fres", day: 10, title: "引き落とし日" },
    {
      key: "fres-deposit-check",
      category: "fres",
      day: 12,
      title: "入金確認（振替後）",
      notes: "10日引き落とし後の着金確認。未着なら督促。",
      tags: ["pay", "recurring"],
    },
    { key: "lex-billing", category: "lex", day: 1, title: "請求案内" },
    { key: "lex-guardian", category: "lex", day: 3, title: "保護者案内" },
    { key: "lex-withdrawal", category: "lex", day: 10, title: "引き落とし日" },
    {
      key: "lex-deposit-check",
      category: "lex",
      day: 12,
      title: "入金確認（振替後）",
      notes: "10日引き落とし後の着金確認。未着なら督促。",
      tags: ["pay", "recurring"],
    },
  ];

  const HABIT_AM = [
    { id: "am1", label: "①５時起床" },
    { id: "am2", label: "②白湯" },
    { id: "am3", label: "③洗顔" },
    { id: "am4", label: "④化粧水" },
    { id: "am5", label: "⑤神棚" },
    { id: "am6", label: "⑥ストレッチ" },
    { id: "am7", label: "⑦筋トレ" },
    { id: "am8", label: "⑧慈悲瞑想" },
    { id: "am9", label: "⑨ニュース確認" },
    { id: "am10", label: "⑩朝日記" },
  ];

  const HABIT_PM = [
    { id: "pm1", label: "①夜日記" },
    { id: "pm2", label: "②洗顔" },
    { id: "pm3", label: "③化粧水" },
    { id: "pm4", label: "④神棚" },
    { id: "pm5", label: "⑤ストレッチ" },
    { id: "pm6", label: "⑥慈悲瞑想" },
    { id: "pm7", label: "⑦読書" },
    { id: "pm8", label: "⑧23時就寝" },
  ];

  const HABIT_DEFS = [...HABIT_AM, ...HABIT_PM];

  /** 行動KPI・内政チェック（四柱の内政最低行動） */
  const NAISEI_KPI = [
    { id: "sleep", label: "睡眠" },
    { id: "meal", label: "食事" },
    { id: "exercise", label: "運動" },
    { id: "impulse", label: "衝動管理" },
  ];

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    if (window.TASKBOARD_TOKEN) headers["X-Taskboard-Token"] = window.TASKBOARD_TOKEN;
    return headers;
  }

  function isoFromDate(d) {
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }

  function dateFromISO(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function todayISO() {
    return isoFromDate(new Date());
  }

  function addDaysISO(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const z = (x) => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }

  function weekKey(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  function monthKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function currentWeekDates() {
    const now = new Date();
    const dow = now.getDay() || 7; // Mon=1..Sun=7
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return isoFromDate(d);
    });
  }

  function last30Dates() {
    return Array.from({ length: 30 }, (_, i) => addDaysISO(-i));
  }

  function dayHasShichitoku(dateISO) {
    const st = (state.plans[`day:${dateISO}`] || {}).shichitoku || {};
    return Object.values(st).some((v) => String(v || "").trim());
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function monthlyDateISO(day, base = new Date()) {
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return isoFromDate(new Date(base.getFullYear(), base.getMonth(), Math.min(day, last)));
  }

  function nextRecurringDue(task) {
    const anchor = dateFromISO(task.dueDate) || new Date();
    if (task.recurrence === "weekly") {
      anchor.setDate(anchor.getDate() + 7);
      return isoFromDate(anchor);
    }
    if (task.recurrence === "monthly") {
      const day = Number(task.recurrenceDay) || anchor.getDate();
      const next = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
      const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, last));
      return isoFromDate(next);
    }
    return task.dueDate;
  }

  function inferCategory(title) {
    const s = title || "";
    if (s.includes("レックス")) return "lex";
    if (s.includes("フレスト")) return "fres";
    if (s.includes("sound")) return "sound";
    if (s.includes("執筆") || s.includes("Kindle")) return "write";
    if (s.includes("発信") || s.includes("LinkedIn") || s.includes("カルーセル") || s.includes("NL")) return "media";
    if (s.includes("【DS】")) return "ds";
    if (s.includes("デザイン") || s.includes("ジェークリーム")) return "design";
    if (s.includes("投資")) return "invest";
    if (s.includes("個人")) return "personal";
    return "other";
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function stripCategoryPrefix(title, categoryId, categories = DEFAULT_CATEGORIES) {
    let s = String(title || "").trim();
    const labels = [];
    const own = categories.find((c) => c.id === categoryId)?.label;
    if (own) labels.push(own);
    categories.forEach((c) => {
      if (c.label && !labels.includes(c.label)) labels.push(c.label);
    });
    // 長いラベルから先に（部分一致の誤爆を防ぐ）
    labels.sort((a, b) => b.length - a.length);
    for (const label of labels) {
      const re = new RegExp(`^【\\s*${escapeRegExp(label)}\\s*】\\s*`);
      if (re.test(s)) {
        s = s.replace(re, "");
        break;
      }
    }
    return s.trim();
  }

  function normalizeTask(t, categories = DEFAULT_CATEGORIES) {
    const recurrence = ["weekly", "monthly"].includes(t.recurrence) ? t.recurrence : "none";
    const due = dateFromISO(t.dueDate);
    const category = t.category || inferCategory(t.title);
    return {
      ...t,
      title: stripCategoryPrefix(t.title || "", category, categories),
      category,
      horizon: t.horizon || "week",
      urgency: t.urgency === "high" ? "high" : "low",
      importance: t.importance === "high" ? "high" : "low",
      tags: Array.isArray(t.tags) ? t.tags : [],
      forced: !!t.forced,
      external: !!t.external,
      deletedAt: t.deletedAt || null,
      recurrence,
      recurrenceDay: recurrence === "monthly" ? Number(t.recurrenceDay) || due?.getDate() || null : null,
    };
  }

  function initCategories(saved) {
    if (!Array.isArray(saved) || !saved.length) {
      return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    }
    const map = Object.fromEntries(saved.map((c) => [c.id, c]));
    return DEFAULT_CATEGORIES.map((def) => {
      const s = map[def.id];
      let label = (s?.label || def.label || "").trim() || def.label;
      label = label.replace(/^【/, "").replace(/】$/, "");
      return { id: def.id, label };
    });
  }

  function hydrateFromData(data) {
    const categories = initCategories(data.categories);
    return {
      tasks: (Array.isArray(data.tasks) ? data.tasks : []).map((t) => normalizeTask(t, categories)),
      reviews: data.reviews || {},
      plans: data.plans || {},
      kpis: data.kpis || {},
      board: mergeBoard(data.board),
      categories,
      sontokuChat: data.sontokuChat && typeof data.sontokuChat === "object" ? data.sontokuChat : {},
      incidents: Array.isArray(data.incidents) ? data.incidents : [],
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
      personalFinance:
        data.personalFinance && typeof data.personalFinance === "object"
          ? { entries: Array.isArray(data.personalFinance.entries) ? data.personalFinance.entries : [] }
          : { entries: [] },
      appointments: Array.isArray(data.appointments) ? data.appointments : [],
      liabilities: Array.isArray(data.liabilities) ? data.liabilities.map(normalizeLiability) : [],
      fiscalMeta:
        data.fiscalMeta && typeof data.fiscalMeta === "object"
          ? {
              defenseLine:
                data.fiscalMeta.defenseLine == null || data.fiscalMeta.defenseLine === ""
                  ? null
                  : Number(data.fiscalMeta.defenseLine),
              note: String(data.fiscalMeta.note || ""),
            }
          : { defenseLine: null, note: "" },
    };
  }

  function loadLocalStorage() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = localStorage.getItem("imadaruma-taskboard-v2") || localStorage.getItem("imadaruma-taskboard-v1");
      if (!raw) return blankState();
      return hydrateFromData(JSON.parse(raw));
    } catch {
      return blankState();
    }
  }

  function defaultBoard() {
    const out = {};
    Object.keys(BOARD_DEFS).forEach((group) => {
      out[group] = {};
      BOARD_DEFS[group].forEach((m) => {
        out[group][m.id] = m.current;
      });
    });
    return out;
  }

  function mergeBoard(saved) {
    const base = defaultBoard();
    if (!saved) return base;
    Object.keys(base).forEach((g) => {
      Object.keys(base[g]).forEach((id) => {
        if (saved[g] && Object.prototype.hasOwnProperty.call(saved[g], id)) {
          base[g][id] = saved[g][id];
        }
      });
    });
    return base;
  }

  function blankState() {
    return {
      tasks: [],
      reviews: {},
      plans: {},
      kpis: {},
      board: defaultBoard(),
      categories: initCategories(),
      sontokuChat: {},
      incidents: [],
      invoices: [],
      personalFinance: { entries: [] },
      appointments: [],
      liabilities: [],
      fiscalMeta: { defenseLine: null, note: "" },
    };
  }

  function snapshotState() {
    return {
      tasks: state.tasks,
      reviews: state.reviews,
      plans: state.plans,
      kpis: state.kpis,
      board: state.board,
      categories: state.categories,
      sontokuChat: state.sontokuChat,
      incidents: state.incidents,
      invoices: state.invoices || [],
      personalFinance: state.personalFinance || { entries: [] },
      appointments: state.appointments || [],
      liabilities: state.liabilities || [],
      fiscalMeta: state.fiscalMeta || { defenseLine: null, note: "" },
    };
  }

  function applyHydrated(next) {
    state.tasks = next.tasks;
    state.reviews = next.reviews;
    state.plans = next.plans;
    state.kpis = next.kpis;
    state.board = next.board;
    state.categories = next.categories;
    state.sontokuChat = next.sontokuChat;
    state.incidents = next.incidents;
    state.invoices = next.invoices || [];
    state.personalFinance = next.personalFinance || { entries: [] };
    state.appointments = next.appointments || [];
    state.liabilities = next.liabilities || [];
    state.fiscalMeta = next.fiscalMeta || { defenseLine: null, note: "" };
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotState()));
  }

  function setSyncStatus(text, mode = "") {
    const el = $("#sync-status");
    if (!el) return;
    el.textContent = text;
    el.dataset.state = mode;
  }

  async function fetchServerState() {
    const response = await fetch("/api/state", { cache: "no-store", headers: authHeaders() });
    if (!response.ok) throw new Error("state_fetch_failed");
    return response.json();
  }

  async function pushServerState(data, expectedUpdatedAt) {
    const response = await fetch("/api/state", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ updatedAt: expectedUpdatedAt, data }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 409) return { conflict: true, ...body };
    if (!response.ok) throw new Error(body.message || "state_save_failed");
    return { conflict: false, ...body };
  }

  async function reloadFromServer(record) {
    const localSnap = snapshotState();
    const remote = record?.data ? record : await fetchServerState();
    serverUpdatedAt = remote.updatedAt || null;
    const hydrated = hydrateFromData(remote.data || blankState());
    const { next, changed: financialMerged } = mergeFinancialFromLocal(localSnap, hydrated);
    applyHydrated(next);
    saveLocal();
    if (financialMerged) scheduleServerSave();
    loadPlanFields();
    render();
    setSyncStatus(financialMerged ? "負債台帳を復元して同期中…" : "最新を反映", "connected");
  }

  /** 旧サーバー保存分などで liabilities / fiscalMeta が落ちたとき、端末側をマージ */
  function mergeFinancialFromLocal(localSnap, remoteHydrated) {
    let changed = false;
    const next = { ...remoteHydrated };
    const localLiab = localSnap.liabilities || [];
    const remoteLiab = next.liabilities || [];
    if (localLiab.length > 0 && remoteLiab.length === 0) {
      next.liabilities = localLiab;
      changed = true;
    }
    const localFm = localSnap.fiscalMeta || { defenseLine: null, note: "" };
    const remoteFm = next.fiscalMeta || { defenseLine: null, note: "" };
    const localHasFm = localFm.defenseLine != null || String(localFm.note || "").trim();
    const remoteHasFm = remoteFm.defenseLine != null || String(remoteFm.note || "").trim();
    if (localHasFm && !remoteHasFm) {
      next.fiscalMeta = localFm;
      changed = true;
    }
    return { next, changed };
  }

  async function refreshFromServerIfNewer() {
    try {
      const remote = await fetchServerState();
      if (!remote.updatedAt || remote.updatedAt === serverUpdatedAt) return;
      await reloadFromServer(remote);
    } catch {
      /* offline */
    }
  }

  async function bootstrapState() {
    setSyncStatus("同期中…", "busy");
    try {
      const remote = await fetchServerState();
      if (remote.updatedAt && remote.data) {
        serverUpdatedAt = remote.updatedAt;
        setSyncStatus("サーバー同期", "connected");
        return hydrateFromData(remote.data);
      }
      const local = loadLocalStorage();
      const hasLocal =
        local.tasks.length > 0 ||
        Object.keys(local.plans).length > 0 ||
        Object.keys(local.kpis).length > 0 ||
        Object.keys(local.sontokuChat).length > 0;
      if (hasLocal) {
        const payload = {
          tasks: local.tasks,
          reviews: local.reviews,
          plans: local.plans,
          kpis: local.kpis,
          board: local.board,
          categories: local.categories,
          sontokuChat: local.sontokuChat,
          incidents: local.incidents || [],
          invoices: local.invoices || [],
          personalFinance: local.personalFinance || { entries: [] },
          appointments: local.appointments || [],
          liabilities: local.liabilities || [],
          fiscalMeta: local.fiscalMeta || { defenseLine: null, note: "" },
        };
        const uploaded = await pushServerState(payload, null);
        if (!uploaded.conflict) {
          serverUpdatedAt = uploaded.updatedAt;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          setSyncStatus("ローカルデータをサーバーへ移行", "connected");
          return hydrateFromData(payload);
        }
      }
      setSyncStatus("新規開始", "connected");
      return hasLocal ? local : blankState();
    } catch {
      setSyncStatus("オフライン（この端末のみ）", "error");
      return loadLocalStorage();
    }
  }

  function scheduleServerSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(async () => {
      try {
        setSyncStatus("保存中…", "busy");
        const result = await pushServerState(snapshotState(), serverUpdatedAt);
        if (result.conflict) {
          const localSnap = snapshotState();
          await reloadFromServer(result);
          const stillEmpty = !(state.liabilities || []).length && (localSnap.liabilities || []).length;
          if (stillEmpty) {
            state.liabilities = localSnap.liabilities;
            state.fiscalMeta = localSnap.fiscalMeta || state.fiscalMeta;
            saveLocal();
            scheduleServerSave();
          }
          return;
        }
        serverUpdatedAt = result.updatedAt;
        setSyncStatus("同期済み", "connected");
      } catch {
        setSyncStatus("オフライン保存", "error");
      }
    }, 450);
  }

  function save() {
    saveLocal();
    scheduleServerSave();
  }

  let state = blankState();
  let serverUpdatedAt = null;
  let saveTimer = null;

  function fmtVal(n, unit) {
    if (n === null || n === undefined || n === "") return "未計測";
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    if (unit === "yen") return `¥${Math.round(num).toLocaleString("ja-JP")}`;
    return String(num);
  }

  function progressPct(def, current) {
    if (current === null || current === undefined || current === "") return 0;
    const c = Number(current);
    const b = Number(def.baseline);
    const t = Number(def.target);
    if (Number.isNaN(c) || t === b) return 0;
    let p;
    if (def.invert) {
      // 減らす指標: baseline → target への到達率
      p = ((b - c) / (b - t)) * 100;
    } else {
      p = ((c - b) / (t - b)) * 100;
    }
    return Math.max(0, Math.min(100, p));
  }

  let openCategory = null;
  let openQuadrant = null;
  let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let pomodoro = { phase: null, taskId: null, taskTitle: "", endsAt: null, timer: null };

  function ensureRequiredMonthlyTasks() {
    let changed = false;
    const findLegacy = (def) =>
      state.tasks.find((t) => {
        if (t.status === "done" || t.deletedAt) return false;
        if (t.scheduleKey === def.key) return true;
        if ((t.category || inferCategory(t.title)) !== def.category) return false;
        if (def.key.endsWith("-billing")) return t.title.includes("請求案内");
        if (def.key.endsWith("-guardian")) return t.title.includes("保護者案内");
        if (def.key.endsWith("-deposit-check")) {
          return t.title.includes("入金確認") || t.title.includes("着金確認");
        }
        return t.title.includes("引き落とし日") || t.title.includes("引き落とし設定（毎月10日送信）");
      });

    REQUIRED_MONTHLY.forEach((def) => {
      let task = findLegacy(def);
      const defaultTags = def.tags || ["recurring"];
      const note = def.notes || `毎月${def.day}日`;
      if (!task) {
        task = normalizeTask({
          id: uid(),
          title: def.title,
          dueDate: monthlyDateISO(def.day),
          category: def.category,
          horizon: "month",
          urgency: "high",
          importance: "high",
          status: "todo",
          onToday: false,
          notes: note,
          tags: defaultTags,
          recurrence: "monthly",
          recurrenceDay: def.day,
          scheduleKey: def.key,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        state.tasks.push(task);
        changed = true;
        return;
      }

      const wasMonthly = task.recurrence === "monthly";
      task.title = def.title;
      task.category = def.category;
      task.scheduleKey = def.key;
      task.recurrence = "monthly";
      task.recurrenceDay = def.day;
      task.tags = [...new Set([...(task.tags || []), ...defaultTags])];
      task.notes = note;
      if (!wasMonthly || !task.dueDate) task.dueDate = monthlyDateISO(def.day);
      task.updatedAt = new Date().toISOString();
      changed = true;
    });

    if (changed) save();
  }

  function catLabel(id) {
    return (state.categories.find((c) => c.id === id) || { label: id }).label;
  }

  function catTag(id) {
    return catLabel(id);
  }

  function priorityMeta(id) {
    return PRIORITIES.find((p) => p.id === id) || { id, label: id, hint: "" };
  }

  function setCatValue(hiddenSel, tagsSel, value) {
    const hidden = $(hiddenSel);
    const wrap = $(tagsSel);
    if (hidden) hidden.value = value;
    if (!wrap) return;
    wrap.querySelectorAll(".cat-tag").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cat === value);
    });
  }

  function mountCatPicker(tagsSel, hiddenSel, { includeAll = false, initial = "other", onSelect } = {}) {
    const wrap = $(tagsSel);
    const hidden = $(hiddenSel);
    if (!wrap || !hidden) return;
    const items = includeAll
      ? [{ id: "all", label: "すべて", tag: "すべて", extra: "tag-all" }, ...state.categories]
      : state.categories;
    wrap.innerHTML = items
      .map((c) => `<button type="button" class="cat-tag tag-${c.id}" data-cat="${c.id}">${escapeHtml(c.tag || c.label)}</button>`)
      .join("");
    wrap.querySelectorAll(".cat-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        setCatValue(hiddenSel, tagsSel, btn.dataset.cat);
        if (includeAll) renderAll();
        if (onSelect) onSelect(btn.dataset.cat);
      });
    });
    setCatValue(hiddenSel, tagsSel, hidden.value || initial);
  }

  function fillCategoryPickers() {
    mountCatPicker("#new-cat-tags", "#new-category", { initial: "other" });
    mountCatPicker("#edit-cat-tags", "#edit-category", { initial: "other" });
    mountCatPicker("#filter-cat-tags", "#filter-cat", {
      includeAll: true,
      initial: "all",
      onSelect: (cat) => {
        if (cat !== "all") setCatValue("#la-category", "#la-cat-tags", cat);
      },
    });
    const filterCat = $("#filter-cat")?.value;
    mountCatPicker("#la-cat-tags", "#la-category", { initial: filterCat && filterCat !== "all" ? filterCat : "other" });
  }

  function ensureForcedMedia() {
    const now = new Date();
    const dow = now.getDay(); // 0 Sun … 6 Sat
    const today = todayISO();
    const in2 = addDaysISO(2);
    const dowIn2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getDay();

    const titleMatches = (taskTitle, canonical, aliases = []) => {
      const t = String(taskTitle || "");
      if (t === canonical || t === `【発信・強制】${canonical}` || t.endsWith(canonical)) return true;
      return aliases.some((a) => t === a || t.includes(a));
    };

    const ensure = (def, kind, due) => {
      const title = def[kind];
      const scheduleKey = def[`${kind}Key`];
      const aliases = kind === "pub" ? def.aliases || [] : [];
      let t = state.tasks.find(
        (x) =>
          !x.deletedAt &&
          x.status !== "done" &&
          (x.scheduleKey === scheduleKey ||
            titleMatches(x.title, title, aliases) ||
            (x.forced && x.category === "media" && titleMatches(x.title, title, aliases)))
      );

      // 別名の重複行はゴミ箱へ（正本1本に寄せる）
      state.tasks.forEach((x) => {
        if (!x || x === t || x.deletedAt || x.status === "done") return;
        if (x.scheduleKey === scheduleKey || titleMatches(x.title, title, aliases)) {
          if (!t) t = x;
          else if (x.id !== t.id) {
            x.deletedAt = new Date().toISOString();
            x.updatedAt = x.deletedAt;
          }
        }
      });

      if (!t) {
        t = {
          id: uid(),
          title,
          dueDate: due,
          category: "media",
          horizon: "day",
          urgency: "high",
          importance: "high",
          status: "todo",
          onToday: due === today,
          notes: "メディア戦略により自動生成（配信日／2日前制作）",
          tags: ["forced", "media"],
          forced: true,
          scheduleKey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.tasks.push(t);
      } else {
        t.title = title;
        t.forced = true;
        t.category = "media";
        t.scheduleKey = scheduleKey;
        t.tags = [...new Set([...(t.tags || []), "forced", "media"])];
        if (due === today) t.onToday = true;
        t.dueDate = due;
        t.horizon = "day";
        t.urgency = "high";
        t.importance = "high";
        t.updatedAt = new Date().toISOString();
      }
    };

    if (MEDIA_FORCE[dow]) ensure(MEDIA_FORCE[dow], "pub", today);
    if (MEDIA_FORCE[dowIn2]) ensure(MEDIA_FORCE[dowIn2], "prep", today);

    save();
  }

  /** 正本の外部AI同期（ChatGPT／Claude）を忘れないための週次強制任務 */
  function ensureForcedAiSync() {
    const scheduleKey = "ops-ai-canon-sync";
    const title = "正本をChatGPT／Claudeへ再貼付";
    const today = todayISO();
    const note = [
      "正本: cabinet/monarch_profile_chatgpt.md",
      "手順: Custom instructions／Project／Memory に貼り直し",
      "戦略・主管を大きく変えた日は週次を待たず即実施",
      "ChatGPT壁打ちの重要分は inbox へ → Cursorで「inboxを処理して」",
      "詳細: sources/chatgpt/README.md / daily_governance/chatgpt_capture.md",
    ].join("\n");

    // 次の日曜（今日が日曜なら今日）
    const now = new Date();
    const daysUntilSun = (7 - now.getDay()) % 7;
    const due = addDaysISO(daysUntilSun);

    let t = state.tasks.find(
      (x) => !x.deletedAt && (x.scheduleKey === scheduleKey || x.title === title)
    );

    if (!t) {
      t = {
        id: uid(),
        title,
        dueDate: due,
        category: "personal",
        horizon: "week",
        urgency: "high",
        importance: "high",
        status: "todo",
        onToday: due === today,
        notes: note,
        tags: ["forced", "ops", "ai-sync"],
        forced: true,
        recurrence: "weekly",
        scheduleKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.tasks.push(t);
    } else {
      t.title = title;
      t.forced = true;
      t.scheduleKey = scheduleKey;
      t.recurrence = "weekly";
      t.category = "personal";
      t.horizon = "week";
      t.urgency = "high";
      t.importance = "high";
      t.notes = note;
      t.tags = [...new Set([...(t.tags || []), "forced", "ops", "ai-sync"])];
      // 完了済みは触らない（完了時に nextRecurringDue で翌週へ出る）
      if (t.status !== "done") {
        if (!t.dueDate || t.dueDate < today) t.dueDate = due;
        if (t.dueDate === today) t.onToday = true;
      }
      t.updatedAt = new Date().toISOString();
    }

    save();
  }

  function importSeed({ replace = false } = {}) {
    const seed = window.TASKBOARD_SEED;
    if (!seed || !Array.isArray(seed.tasks)) return 0;
    const now = new Date().toISOString();
    const existing = new Set(state.tasks.map((t) => t.title));
    let added = 0;
    if (replace) {
      state.tasks = state.tasks.filter((t) => t.forced);
      existing.clear();
      state.tasks.forEach((t) => existing.add(t.title));
    }
    seed.tasks.forEach((raw) => {
      if (existing.has(raw.title)) return;
      state.tasks.push(
        normalizeTask({
          id: uid(),
          title: raw.title,
          dueDate: raw.dueDate || null,
          category: raw.category || inferCategory(raw.title),
          horizon: raw.horizon || "week",
          urgency: raw.urgency,
          importance: raw.importance,
          status: "todo",
          onToday: raw.horizon === "day" && raw.urgency === "high",
          notes: raw.notes || "",
          tags: raw.tags || [],
          recurrence: raw.recurrence || "none",
          recurrenceDay: raw.recurrenceDay || null,
          scheduleKey: raw.scheduleKey || null,
          createdAt: now,
          updatedAt: now,
        })
      );
      existing.add(raw.title);
      added += 1;
    });
    let n = state.tasks.filter((t) => t.onToday && !t.forced && t.status !== "done").length;
    state.tasks.forEach((t) => {
      if (n <= 7) return;
      if (t.onToday && !t.forced && t.status !== "done") {
        t.onToday = false;
        n -= 1;
      }
    });
    ensureRequiredMonthlyTasks();
    save();
    ensureForcedMedia();
    ensureForcedAiSync();
    return added;
  }

  function quadrant(task) {
    const u = task.urgency === "high";
    const i = task.importance === "high";
    if (u && i) return "uu";
    if (u && !i) return "un";
    if (!u && i) return "nu";
    return "nn";
  }

  function activeTasks() {
    return state.tasks.filter((t) => t.status !== "done" && t.status !== "pending" && !t.deletedAt);
  }

  function pendingTasks() {
    return state.tasks.filter((t) => t.status === "pending" && !t.deletedAt);
  }

  function doneTasks() {
    return state.tasks.filter((t) => t.status === "done" && !t.deletedAt);
  }

  function trashedTasks() {
    return state.tasks.filter((t) => !!t.deletedAt);
  }

  function purgeOldTrash() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const before = state.tasks.length;
    state.tasks = state.tasks.filter((t) => !(t.deletedAt && new Date(t.deletedAt).getTime() < cutoff));
    if (state.tasks.length !== before) save();
  }

  function inWip(t) {
    return !t.forced && t.status !== "done" && !t.deletedAt && (!!t.onToday || t.status === "doing");
  }

  function wipCount() {
    return state.tasks.filter(inWip).length;
  }

  function inDay(t) {
    return !!(t.onToday || t.horizon === "day" || (t.dueDate && t.dueDate <= todayISO()) || t.forced);
  }

  function inWeek(t) {
    return inDay(t) || t.horizon === "week" || (t.dueDate && t.dueDate <= addDaysISO(7));
  }

  function inMonth(t) {
    return (inWeek(t) && t.horizon !== "someday") || t.horizon === "month" || (t.dueDate && t.dueDate <= addDaysISO(30));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function rowHtml(t) {
    const cat = t.category || "other";
    const force = t.forced ? '<span class="force-tag">強制</span>' : "";
    const external = t.external ? '<span class="external-tag">対外</span>' : "";
    const doing = t.status === "doing" ? '<span class="doing-tag">着手中</span>' : "";
    const pending = t.status === "pending" ? '<span class="pending-tag">上奏中</span>' : "";
    const repeat = t.recurrence === "weekly"
      ? '<span class="repeat-tag">毎週</span>'
      : t.recurrence === "monthly"
        ? `<span class="repeat-tag">毎月${t.recurrenceDay || ""}日</span>`
        : "";
    const pill = `<span class="row-cat tag-${cat}">${catTag(cat)}</span>`;
    const q = { uu: "今すぐ", un: "見せかけ", nu: "種まき", nn: "減らす" }[quadrant(t)];
    return `<li class="row-item border-${cat} ${t.status === "done" ? "done" : ""} ${t.forced ? "forced" : ""}" data-id="${t.id}">
      <span class="dot dot-${cat}"></span>
      <span class="row-title">${pill}${force}${external}${doing}${pending}${repeat}${escapeHtml(t.title)}</span>
      <span class="row-meta">${q}${t.dueDate ? " · " + t.dueDate.slice(5) : ""}</span>
      <span class="row-actions">
        ${t.status === "pending" ? `<button type="button" data-act="approve">承認</button>` : ""}
        ${t.status !== "done" && t.status !== "pending" ? `<button type="button" data-act="done">完</button>` : ""}
        ${t.status === "done" ? `<button type="button" data-act="undone">戻</button>` : ""}
        ${!t.onToday && t.status !== "done" && t.status !== "pending" ? `<button type="button" data-act="today">今日</button>` : ""}
        ${t.status === "todo" ? `<button type="button" data-act="start">着手</button>` : ""}
        ${t.status === "doing" ? `<button type="button" data-act="unstart">戻す</button>` : ""}
        <button type="button" data-act="edit">編</button>
      </span>
    </li>`;
  }

  function bindRows(ul) {
    if (!ul) return;
    ul.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.closest(".row-item").dataset.id;
        const act = btn.dataset.act;
        const t = state.tasks.find((x) => x.id === id);
        if (!t) return;
        if (act === "done") {
          if (t.recurrence === "weekly" || t.recurrence === "monthly") {
            const nextDue = nextRecurringDue(t);
            state.tasks.push(
              normalizeTask({
                ...t,
                id: uid(),
                status: "todo",
                dueDate: nextDue,
                onToday: false,
                lastCompletedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            );
            t.lastCompletedAt = new Date().toISOString();
            t.status = "done";
          } else {
            t.status = "done";
          }
          t.onToday = false;
        } else if (act === "undone") {
          t.status = "todo";
        } else if (act === "today") {
          if (!inWip(t) && wipCount() >= 7) {
            alert("今日・着手中の合計が7件が目安です。");
            return;
          }
          t.onToday = true;
          t.horizon = "day";
        } else if (act === "start") {
          if (!inWip(t) && wipCount() >= 7) {
            alert("今日・着手中の合計が7件が目安です。");
            return;
          }
          t.status = "doing";
        } else if (act === "unstart") {
          t.status = "todo";
        } else if (act === "approve") {
          t.status = "todo";
        } else if (act === "edit") {
          openEdit(id);
          return;
        }
        t.updatedAt = new Date().toISOString();
        save();
        render();
      });
    });
  }

  function fillList(sel, list) {
    const ul = $(sel);
    if (!ul) return;
    ul.innerHTML = list.length ? list.map(rowHtml).join("") : '<li class="empty">なし</li>';
    bindRows(ul);
  }

  function renderPendingBanner() {
    const el = $("#pending-banner");
    if (!el) return;
    const n = pendingTasks().length;
    el.classList.toggle("hidden", n === 0);
    if (n > 0) el.textContent = `上奏（保留中）が${n}件。一覧タブで「承認」すると通常の任務になる。`;
  }

  function renderGovernanceStatus() {
    const el = $("#governance-status");
    if (!el || !window.TaskboardGovernance) return;
    el.classList.remove("hidden");

    const domains = window.TaskboardGovernance.assessDomains(state);
    const domainsHost = $("#governance-domains");
    if (domainsHost) {
      domainsHost.innerHTML = domains
        .map((d) => {
          const reasons = (d.reasons || []).slice(0, 2);
          const reasonsHtml = reasons.length
            ? `<ul class="governance-domain-reasons">${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
            : "";
          const actionHtml = d.recommendedAction
            ? `<p class="governance-domain-action">→ ${escapeHtml(d.recommendedAction)}</p>`
            : "";
          return `<div class="governance-domain status-${d.status}">
            <span class="governance-domain-name">${escapeHtml(d.name)}</span>
            <span class="governance-domain-score">${d.score}</span>
            <p class="governance-domain-summary">${escapeHtml(d.summary)}</p>
            ${reasonsHtml}
            ${actionHtml}
          </div>`;
        })
        .join("");
    }

    const alerts = window.TaskboardGovernance.getGovernanceAlerts(state);
    const alertsHost = $("#governance-alerts");
    if (alertsHost) {
      if (!alerts.length) {
        alertsHost.innerHTML = "";
      } else {
        const severityOrder = { urgent: 0, caution: 1, info: 2 };
        const sorted = [...alerts].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
        const itemHtml = (a) => `<li class="governance-alert severity-${a.severity}">${escapeHtml(a.title)}</li>`;
        const top = sorted.slice(0, 3);
        const rest = sorted.slice(3);
        let html = `<ul class="governance-alert-list">${top.map(itemHtml).join("")}</ul>`;
        if (rest.length) {
          html += `<details class="governance-alert-more"><summary>すべて見る（他${rest.length}件）</summary><ul class="governance-alert-list">${rest
            .map(itemHtml)
            .join("")}</ul></details>`;
        }
        alertsHost.innerHTML = html;
      }
    }
  }

  function trashRowHtml(t) {
    const cat = t.category || "other";
    const daysLeft = Math.max(
      0,
      7 - Math.floor((Date.now() - new Date(t.deletedAt).getTime()) / (24 * 60 * 60 * 1000))
    );
    return `<li class="row-item border-${cat}" data-id="${t.id}">
      <span class="dot dot-${cat}"></span>
      <span class="row-title"><span class="row-cat tag-${cat}">${catTag(cat)}</span>${escapeHtml(t.title)}</span>
      <span class="row-meta">残り${daysLeft}日で完全削除</span>
      <span class="row-actions">
        <button type="button" data-act="restore">復元</button>
        <button type="button" data-act="purge">完全削除</button>
      </span>
    </li>`;
  }

  function bindTrashRows(ul) {
    if (!ul) return;
    ul.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.closest(".row-item").dataset.id;
        const act = btn.dataset.act;
        const t = state.tasks.find((x) => x.id === id);
        if (!t) return;
        if (act === "restore") {
          t.deletedAt = null;
          t.updatedAt = new Date().toISOString();
        } else if (act === "purge") {
          if (!confirm("完全に削除しますか？元に戻せません。")) return;
          state.tasks = state.tasks.filter((x) => x.id !== id);
        }
        save();
        render();
      });
    });
  }

  function renderTrash() {
    const ul = $("#list-trash");
    if (!ul) return;
    const list = trashedTasks();
    ul.innerHTML = list.length ? list.map(trashRowHtml).join("") : '<li class="empty">なし</li>';
    bindTrashRows(ul);
  }

  function renderDoneList() {
    fillList("#list-done", doneTasks());
  }

  function renderHome() {
    renderPendingBanner();
    const quadGrid = $("#quad-overview");
    const catGrid = $("#cat-overview");
    const quadCounts = { uu: 0, un: 0, nu: 0, nn: 0 };
    const catCounts = {};
    state.categories.forEach((c) => {
      catCounts[c.id] = 0;
    });
    activeTasks().forEach((t) => {
      quadCounts[quadrant(t)] += 1;
      const id = t.category || "other";
      catCounts[id] = (catCounts[id] || 0) + 1;
    });

    if (quadGrid) {
      quadGrid.innerHTML = PRIORITIES.map((p) => {
        const n = quadCounts[p.id] || 0;
        return `<button type="button" class="overview-card quad-card ${p.accent ? "accent" : ""}" data-quad="${p.id}">
          <div class="name">${escapeHtml(p.label)}</div>
          <div class="num">${n}</div>
          <div class="meta">未完了</div>
        </button>`;
      }).join("");
      quadGrid.querySelectorAll(".quad-card").forEach((card) => {
        card.addEventListener("click", () => {
          openQuadrant = card.dataset.quad;
          setView("quad");
        });
      });
    }

    if (!catGrid) return;
    catGrid.innerHTML = state.categories
      .map((c) => {
        const n = catCounts[c.id] || 0;
        return `<button type="button" class="overview-card cat-card" data-cat="${c.id}">
          <div class="name"><span class="dot dot-${c.id}"></span>${escapeHtml(c.label)}</div>
          <div class="num">${n}</div>
          <div class="meta">未完了</div>
        </button>`;
      })
      .join("");
    catGrid.querySelectorAll(".cat-card").forEach((card) => {
      card.addEventListener("click", () => {
        openCategory = card.dataset.cat;
        setView("cat");
      });
    });
  }

  function renderCat() {
    const id = openCategory || "other";
    $("#cat-detail-title").textContent = `${catLabel(id)} · 未完了`;
    const list = activeTasks().filter((t) => (t.category || "other") === id);
    fillList("#list-cat", list);
  }

  function renderQuad() {
    const q = openQuadrant || "uu";
    const meta = priorityMeta(q);
    $("#quad-detail-title").textContent = `${meta.label} · 未完了`;
    const hint = $("#quad-detail-hint");
    if (hint) hint.textContent = meta.hint || "";
    const list = activeTasks().filter((t) => quadrant(t) === q);
    fillList("#list-quad", list);
  }

  function renderBoard() {
    const buckets = { uu: [], un: [], nu: [], nn: [] };
    activeTasks().forEach((t) => buckets[quadrant(t)].push(t));
    Object.keys(buckets).forEach((q) => {
      $(`#c-${q}`).textContent = String(buckets[q].length);
      fillList(`#list-${q}`, buckets[q]);
    });
  }

  function renderHorizons() {
    const day = activeTasks().filter(inDay);
    $("#day-warn").classList.toggle("hidden", day.filter((t) => !t.forced).length <= 7);
    fillList("#list-day", day);
    fillList("#list-week", activeTasks().filter(inWeek));
    fillList(
      "#list-month",
      activeTasks().filter((t) => inMonth(t) && t.horizon !== "someday")
    );
    fillList(
      "#list-someday",
      activeTasks().filter((t) => t.horizon === "someday")
    );
  }

  function renderAll() {
    const hideDone = $("#hide-done").checked;
    const fq = $("#filter-quad").value;
    const fc = $("#filter-cat").value;
    const fh = $("#filter-horizon").value;
    const externalOnly = $("#filter-external")?.checked;
    const currentMonth = monthKey();
    let list = state.tasks.filter((t) => !t.deletedAt);
    list = list.filter((t) => t.recurrence === "none" || !t.dueDate || t.dueDate.slice(0, 7) <= currentMonth);
    if (hideDone) list = list.filter((t) => t.status !== "done");
    if (fq !== "all") list = list.filter((t) => quadrant(t) === fq);
    if (fc !== "all") list = list.filter((t) => (t.category || "other") === fc);
    if (fh !== "all") list = list.filter((t) => (t.horizon || "week") === fh);
    if (externalOnly) list = list.filter((t) => t.external);
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "done" ? 1 : -1;
      if (!!a.external !== !!b.external) return a.external ? -1 : 1;
      const ad = a.dueDate || "9999-99-99";
      const bd = b.dueDate || "9999-99-99";
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
    fillList("#list-all", list);
  }

  function renderCurrentDate() {
    const now = new Date();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    $("#today-date").textContent = `今日 ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;
  }

  function calendarEvents(year, month) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const events = [];
    const pushTask = (task, date, type) => {
      events.push({
        date: isoFromDate(date),
        title: task.title,
        category: task.category || "other",
        type,
        taskId: task.id,
      });
    };

    state.tasks.filter((t) => t.status !== "done" && !t.deletedAt && t.dueDate).forEach((task) => {
      const anchor = dateFromISO(task.dueDate);
      if (!anchor) return;
      if (task.recurrence === "monthly") {
        if (monthEnd < anchor) return;
        const day = Number(task.recurrenceDay) || anchor.getDate();
        const last = monthEnd.getDate();
        pushTask(task, new Date(year, month, Math.min(day, last)), "repeat");
        return;
      }
      if (task.recurrence === "weekly") {
        if (monthEnd < anchor) return;
        const first = new Date(Math.max(monthStart.getTime(), anchor.getTime()));
        const offset = (anchor.getDay() - first.getDay() + 7) % 7;
        first.setDate(first.getDate() + offset);
        for (const d = new Date(first); d <= monthEnd; d.setDate(d.getDate() + 7)) {
          pushTask(task, new Date(d), "repeat");
        }
        return;
      }
      if (anchor.getFullYear() === year && anchor.getMonth() === month) pushTask(task, anchor, "task");
    });

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const date = new Date(year, month, day);
      (MEDIA_CALENDAR[date.getDay()] || []).forEach((title) => {
        events.push({
          date: isoFromDate(date),
          title,
          category: "media",
          type: "media",
          taskId: null,
        });
      });
    }
    return events;
  }

  function renderCalendar() {
    const host = $("#calendar-grid");
    if (!host) return;
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const byDate = {};
    calendarEvents(year, month).forEach((event) => {
      (byDate[event.date] ||= []).push(event);
    });
    $("#calendar-title").textContent = `${year}年${month + 1}月`;

    const cells = [];
    for (let i = 0; i < firstDay; i += 1) cells.push('<div class="calendar-cell blank"></div>');
    for (let day = 1; day <= lastDay; day += 1) {
      const iso = isoFromDate(new Date(year, month, day));
      const events = byDate[iso] || [];
      const eventHtml = events.map((event) => {
        const content = `<span class="dot dot-${event.category}"></span>${escapeHtml(event.title)}`;
        return event.taskId
          ? `<button type="button" class="calendar-event ${event.type}" data-task-id="${event.taskId}">${content}</button>`
          : `<div class="calendar-event ${event.type}">${content}</div>`;
      }).join("");
      cells.push(`<div class="calendar-cell ${iso === todayISO() ? "today" : ""}">
        <div class="calendar-day">${day}</div>
        <div class="calendar-events">${eventHtml}</div>
      </div>`);
    }
    host.innerHTML = cells.join("");
    host.querySelectorAll("[data-task-id]").forEach((button) => {
      button.addEventListener("click", () => openEdit(button.dataset.taskId));
    });
  }

  function renderBoardMetrics() {
    ["finance", "diplomacy", "naisei"].forEach((group) => {
      const host = $(`#board-${group}`);
      if (!host) return;
      host.innerHTML = BOARD_DEFS[group]
        .map((def) => {
          const cur = state.board[group][def.id];
          const pct = progressPct(def, cur);
          const curStr = cur === null || cur === undefined ? "" : cur;
          return `<div class="metric-row" data-group="${group}" data-id="${def.id}">
            <div>
              <div class="label">${escapeHtml(def.label)}</div>
              <div class="baseline">基準 ${fmtVal(def.baseline, def.unit)} → 目標(${TARGET_DATE.slice(5)}) ${fmtVal(def.target, def.unit)}</div>
            </div>
            <label>現在
              <input type="number" step="any" data-board-input value="${curStr}" placeholder="未計測" />
            </label>
            <div class="target">${pct.toFixed(0)}%</div>
            <div class="progress"><span style="width:${pct}%"></span></div>
          </div>`;
        })
        .join("");
    });
  }

  function readBoardFromDom() {
    $$(".metric-row[data-group]").forEach((row) => {
      const g = row.dataset.group;
      const id = row.dataset.id;
      const input = row.querySelector("[data-board-input]");
      if (!input) return;
      const v = input.value.trim();
      state.board[g][id] = v === "" ? null : Number(v);
    });
  }

  function loadPlanFields() {
    const d = todayISO();
    const w = weekKey();
    const m = monthKey();
    const dayPlan = state.plans[`day:${d}`] || {};
    const weekPlan = state.plans[`week:${w}`] || {};
    const monthPlan = state.plans[`month:${m}`] || {};
    const kpi = state.kpis[d] || {};
    const yesterdayPlan = state.plans[`day:${addDaysISO(-1)}`] || {};
    $("#day-goal").value = dayPlan.goal || yesterdayPlan.tomorrow || "";
    $("#day-ifthen").value = dayPlan.ifthen || "";
    renderHabitChecks(dayPlan.habits || {});
    if ($("#appt-date") && !$("#appt-date").value) $("#appt-date").value = d;
    $("#good1").value = dayPlan.good1 || "";
    $("#good2").value = dayPlan.good2 || "";
    $("#good3").value = dayPlan.good3 || "";
    $("#grate1").value = dayPlan.grate1 || "";
    $("#grate2").value = dayPlan.grate2 || "";
    $("#grate3").value = dayPlan.grate3 || "";
    $("#day-lesson").value = dayPlan.lesson || "";
    $("#day-tomorrow").value = dayPlan.tomorrow || "";
    const st = dayPlan.shichitoku || {};
    $("#st-chi").value = st.chi || "";
    $("#st-shin").value = st.shin || "";
    $("#st-jin").value = st.jin || "";
    $("#st-yu").value = st.yu || "";
    $("#st-gen").value = st.gen || "";
    $("#st-mei").value = st.mei || "";
    $("#st-bi").value = st.bi || "";
    $("#day-strength").value = dayPlan.strength || "";
    $("#week-purpose").value = weekPlan.purpose || weekPlan.goal || "";
    $("#week-numeric").value = weekPlan.numeric || "";
    $("#week-actions").value = weekPlan.actions || "";
    $("#week-review").value = weekPlan.review || "";
    $("#week-habit-done").value = weekPlan.habitDone ?? "";
    $("#week-habit-total").value = weekPlan.habitTotal ?? 7;
    $("#week-workout").value = weekPlan.workout ?? "";
    $("#week-schedule-perfect").value = weekPlan.schedulePerfect ?? "";
    $("#month-purpose").value = monthPlan.purpose || monthPlan.goal || "";
    $("#month-numeric").value = monthPlan.numeric || "";
    $("#month-actions").value = monthPlan.actions || "";
    $("#month-review").value = monthPlan.review || "";
    $("#kpi-sales-target").value = kpi.salesTarget ?? "";
    $("#kpi-media-target").value = kpi.mediaTarget ?? "";
    $("#kpi-sales").value = kpi.sales ?? "";
    $("#kpi-media").value = kpi.media ?? "";
    renderNaiseiChecks(dayPlan.naisei || kpi.naisei || {});
    renderBoardMetrics();
    renderWeeklySummary();
    renderShichitokuScore();
  }

  function emptyNaiseiMap() {
    return Object.fromEntries(NAISEI_KPI.map((item) => [item.id, false]));
  }

  function normalizeNaiseiMap(raw) {
    const base = emptyNaiseiMap();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
    NAISEI_KPI.forEach((item) => {
      base[item.id] = !!raw[item.id];
    });
    return base;
  }

  function renderNaiseiChecks(values = {}) {
    const host = $("#day-naisei");
    if (!host) return;
    const map = normalizeNaiseiMap(values);
    host.innerHTML = NAISEI_KPI.map(
      (item) => `
        <label class="naisei-check">
          <input type="checkbox" data-naisei="night" data-id="${item.id}" ${map[item.id] ? "checked" : ""} />
          <span>${escapeHtml(item.label)}</span>
        </label>`
    ).join("");
  }

  function readNaiseiChecks() {
    const out = emptyNaiseiMap();
    $$('[data-naisei="night"]').forEach((el) => {
      const id = el.dataset.id;
      if (id in out) out[id] = !!el.checked;
    });
    return out;
  }

  function numOrNull(sel) {
    const el = $(sel);
    if (!el || el.value === "") return null;
    const n = Number(el.value);
    return Number.isFinite(n) ? n : null;
  }

  /* —— 七徳スコア・称号（直近30日の記入頻度） —— */
  const SHICHITOKU_LABELS = { chi: "智慧", shin: "信義", jin: "仁愛", yu: "勇気", gen: "厳正", mei: "明察", bi: "美学" };

  function shichitokuScore() {
    const dates = last30Dates();
    const counts = { chi: 0, shin: 0, jin: 0, yu: 0, gen: 0, mei: 0, bi: 0 };
    let anyDays = 0;
    dates.forEach((d) => {
      const st = (state.plans[`day:${d}`] || {}).shichitoku || {};
      let any = false;
      Object.keys(counts).forEach((k) => {
        if (String(st[k] || "").trim()) {
          counts[k] += 1;
          any = true;
        }
      });
      if (any) anyDays += 1;
    });
    return { counts, anyDays, totalDays: dates.length };
  }

  function shichitokuTitle(anyDays) {
    if (anyDays >= 21) return "明君（継続確立）";
    if (anyDays >= 7) return "精進中";
    return "見習い";
  }

  function renderShichitokuScore() {
    const host = $("#shichitoku-score");
    if (!host) return;
    const { counts, anyDays, totalDays } = shichitokuScore();
    host.innerHTML = `
      <p class="board-head">称号: ${shichitokuTitle(anyDays)}（直近${totalDays}日中${anyDays}日 記入）</p>
      <div class="metric-table">
        ${Object.keys(SHICHITOKU_LABELS)
          .map(
            (k) => `<div class="metric-row"><div><div class="label">${SHICHITOKU_LABELS[k]}</div></div><div class="target">${counts[k]}/${totalDays}</div></div>`
          )
          .join("")}
      </div>
    `;
  }

  /* —— 週次御前会議レポート（四本柱バランス・七徳・国難・強みを1画面に集計） —— */
  function renderWeeklySummary() {
    const host = $("#week-summary");
    if (!host) return;
    const dates = currentWeekDates();
    const shichitokuDays = dates.filter(dayHasShichitoku).length;
    const strengthDays = dates.filter((d) => String((state.plans[`day:${d}`] || {}).strength || "").trim()).length;
    const incidentCount = (state.incidents || []).filter((e) => dates.includes(e.date)).length;
    const weekDone = state.tasks.filter(
      (t) => t.status === "done" && !t.deletedAt && dates.includes(String(t.updatedAt || "").slice(0, 10))
    );

    const catCounts = {};
    const quadCounts = { uu: 0, un: 0, nu: 0, nn: 0 };
    weekDone.forEach((t) => {
      const c = t.category || "other";
      catCounts[c] = (catCounts[c] || 0) + 1;
      quadCounts[quadrant(t)] += 1;
    });
    const quadLabel = { uu: "今すぐ", un: "見せかけ", nu: "種まき", nn: "減らす" };
    const catRows = Object.keys(catCounts)
      .map((c) => `<div class="summary-row">${escapeHtml(catLabel(c))}: ${catCounts[c]}件</div>`)
      .join("");
    const quadRows = Object.keys(quadCounts)
      .filter((q) => quadCounts[q] > 0)
      .map((q) => `<div class="summary-row">${quadLabel[q]}: ${quadCounts[q]}件</div>`)
      .join("");
    const detailRows = weekDone
      .map(
        (t) =>
          `<div class="summary-row">${String(t.updatedAt || "").slice(5, 10)} ・ ${escapeHtml(
            catLabel(t.category || "other")
          )} ・ ${escapeHtml(t.title)}</div>`
      )
      .join("");

    host.innerHTML = `
      <div class="summary-row">七徳チェック記入: ${shichitokuDays}/7日</div>
      <div class="summary-row">強みの記録: ${strengthDays}/7日</div>
      <div class="summary-row">国難ログ件数: ${incidentCount}件</div>
      <div class="summary-row">完了タスク（週内）: ${weekDone.length}件</div>
      <details class="week-detail">
        <summary>カテゴリ別バランス</summary>
        ${catRows || '<div class="summary-row">なし</div>'}
      </details>
      <details class="week-detail">
        <summary>優先度別バランス</summary>
        ${quadRows || '<div class="summary-row">なし</div>'}
      </details>
      <details class="week-detail">
        <summary>詳細を見る（${weekDone.length}件）</summary>
        ${detailRows || '<div class="summary-row">なし</div>'}
      </details>
    `;
  }

  /* —— イマダルマのビジュアル進捗（直近7日の七徳記入率を目の開き具合で表す） —— */
  function imadarumaProgressRatio() {
    const dates = currentWeekDates();
    const filled = dates.filter(dayHasShichitoku).length;
    return filled / dates.length;
  }

  function renderImadarumaProgress() {
    const host = $("#imadaruma-progress");
    if (!host) return;
    const ratio = imadarumaProgressRatio();
    const pct = Math.round(ratio * 100);
    const openness = (2 + ratio * 6).toFixed(1);
    host.innerHTML = `
      <svg viewBox="0 0 120 60" width="56" height="28" role="img" aria-label="七徳記入率 ${pct}%（直近7日）">
        <circle cx="30" cy="30" r="18" fill="#fff" stroke="#3d7ea6" stroke-width="3"></circle>
        <circle cx="30" cy="30" r="7" fill="#2f2f2f"></circle>
        <circle cx="90" cy="30" r="18" fill="#fff" stroke="#3d7ea6" stroke-width="3"></circle>
        <circle cx="90" cy="30" r="${openness}" fill="#2f2f2f"></circle>
      </svg>
      <span class="imadaruma-pct">七徳 直近7日 ${pct}%（片目は自己統治の進捗で開く）</span>
    `;
  }

  /* —— 国難ログ（衝動・脱線の記録。impulse_protocol.mdの6分類） —— */
  function todayIncidents() {
    return (state.incidents || []).filter((e) => e.date === todayISO());
  }

  function renderHabitChecks(habits = {}) {
    const fill = (sel, defs) => {
      const wrap = $(sel);
      if (!wrap) return;
      wrap.innerHTML = defs
        .map(
          (h) =>
            `<label class="habit-item"><input type="checkbox" data-habit="${h.id}" ${habits[h.id] ? "checked" : ""} /> ${escapeHtml(h.label)}</label>`
        )
        .join("");
    };
    fill("#day-habits-am", HABIT_AM);
    fill("#day-habits-pm", HABIT_PM);
  }

  function readHabitChecks(scope = "all") {
    const habits = {};
    const root =
      scope === "am" ? "#day-habits-am" : scope === "pm" ? "#day-habits-pm" : "#day-habits-am, #day-habits-pm";
    $$(`${root} [data-habit]`).forEach((el) => {
      habits[el.dataset.habit] = !!el.checked;
    });
    return habits;
  }

  function habitSummary(habits = {}) {
    const done = HABIT_DEFS.filter((h) => habits[h.id]).length;
    const amDone = HABIT_AM.filter((h) => habits[h.id]).length;
    const pmDone = HABIT_PM.filter((h) => habits[h.id]).length;
    return {
      done,
      total: HABIT_DEFS.length,
      amDone,
      amTotal: HABIT_AM.length,
      pmDone,
      pmTotal: HABIT_PM.length,
      habits,
    };
  }

  function syncWeekHabitFromDays() {
    const dates = currentWeekDates();
    let habitDone = 0;
    dates.forEach((d) => {
      const habits = (state.plans[`day:${d}`] || {}).habits || {};
      const { done, total } = habitSummary(habits);
      if (total > 0 && done === total) habitDone += 1;
    });
    const w = weekKey();
    const weekPlan = state.plans[`week:${w}`] || {};
    weekPlan.habitDone = habitDone;
    weekPlan.habitTotal = 7;
    state.plans[`week:${w}`] = weekPlan;
    if ($("#week-habit-done")) $("#week-habit-done").value = habitDone;
    if ($("#week-habit-total")) $("#week-habit-total").value = 7;
  }

  function renderInvoices() {
    const list = $("#list-invoices");
    if (!list) return;
    const rows = (state.invoices || [])
      .slice()
      .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")))
      .map((inv) => {
        const dir = inv.direction === "out" ? "送付" : "受取";
        const status = inv.status || "inbox";
        const amount = inv.amount != null ? `¥${Number(inv.amount).toLocaleString("ja-JP")}` : "—";
        return `<li class="row-item" data-invoice-id="${inv.id}">
          <div class="row-main">
            <strong>${escapeHtml(dir)} · ${escapeHtml(inv.party || "（相手未記入）")}</strong>
            <span class="muted">${amount} · 期限 ${escapeHtml(inv.dueDate || "未設定")} · ${escapeHtml(status)}</span>
            ${inv.notes ? `<span class="muted">${escapeHtml(inv.notes)}</span>` : ""}
          </div>
          <div class="row-actions">
            ${status !== "paid" ? `<button type="button" class="btn ghost compact" data-inv-paid>支払済</button>` : ""}
            <button type="button" class="btn ghost compact" data-inv-del>削除</button>
          </div>
        </li>`;
      });
    list.innerHTML = rows.length ? rows.join("") : `<li class="muted">請求書はまだありません</li>`;
    list.querySelectorAll("[data-inv-paid]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-invoice-id]")?.dataset.invoiceId;
        const inv = (state.invoices || []).find((x) => x.id === id);
        if (!inv) return;
        inv.status = "paid";
        inv.updatedAt = new Date().toISOString();
        save();
        renderInvoices();
      });
    });
    list.querySelectorAll("[data-inv-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-invoice-id]")?.dataset.invoiceId;
        if (!id || !confirm("この請求書を削除しますか？")) return;
        state.invoices = (state.invoices || []).filter((x) => x.id !== id);
        save();
        renderInvoices();
      });
    });
  }

  function renderPersonalFinance() {
    const list = $("#list-pf");
    const sumEl = $("#pf-month-sum");
    if (!list) return;
    const month = monthKey();
    const entries = ((state.personalFinance || {}).entries || [])
      .filter((e) => String(e.date || "").startsWith(month))
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    let income = 0;
    let expense = 0;
    entries.forEach((e) => {
      const n = Number(e.amount) || 0;
      if (e.type === "in") income += n;
      else expense += n;
    });
    if (sumEl) {
      sumEl.textContent = `今月 入金 ¥${income.toLocaleString("ja-JP")} − 出金 ¥${expense.toLocaleString("ja-JP")} ＝ 差引 ¥${(income - expense).toLocaleString("ja-JP")}`;
    }
    list.innerHTML = entries.length
      ? entries
          .map(
            (e) => `<li class="row-item" data-pf-id="${e.id}">
          <div class="row-main">
            <strong>${e.type === "in" ? "入金" : "出金"} · ¥${Number(e.amount || 0).toLocaleString("ja-JP")}</strong>
            <span class="muted">${escapeHtml(e.date || "")} · ${escapeHtml(e.category || "未分類")}${e.memo ? ` · ${escapeHtml(e.memo)}` : ""}</span>
          </div>
          <div class="row-actions">
            <button type="button" class="btn ghost compact" data-pf-del>削除</button>
          </div>
        </li>`
          )
          .join("")
      : `<li class="muted">今月の記録はまだありません</li>`;
    list.querySelectorAll("[data-pf-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-pf-id]")?.dataset.pfId;
        if (!id) return;
        state.personalFinance.entries = (state.personalFinance.entries || []).filter((x) => x.id !== id);
        save();
        renderPersonalFinance();
      });
    });
  }

  const LIAB_KIND_LABEL = {
    rent: "家賃",
    tax: "税金",
    social: "社会保険",
    card: "カード／借入",
    utility: "光熱・通信",
    other: "その他",
  };
  const LIAB_STATUS_LABEL = {
    overdue: "滞納",
    plan: "分割／予定",
    ok: "期限内",
    done: "清算済",
  };

  function yen(n) {
    return `¥${Number(n || 0).toLocaleString("ja-JP")}`;
  }

  function normalizeLiability(item) {
    const base = item && typeof item === "object" ? item : {};
    return {
      id: base.id || uid(),
      creditor: String(base.creditor || "").trim(),
      kind: base.kind || "other",
      balance: Number(base.balance) || 0,
      minPay: base.minPay == null || base.minPay === "" ? null : Number(base.minPay),
      dueDate: base.dueDate || null,
      status: base.status || "ok",
      notes: String(base.notes || "").trim(),
      payments: Array.isArray(base.payments)
        ? base.payments.map((p) => ({
            id: p.id || uid(),
            date: p.date || todayISO(),
            amount: Number(p.amount) || 0,
            note: String(p.note || "").trim(),
            balanceAfter: p.balanceAfter == null ? null : Number(p.balanceAfter),
          }))
        : [],
      createdAt: base.createdAt || new Date().toISOString(),
      updatedAt: base.updatedAt || new Date().toISOString(),
    };
  }

  function renderLiabPayHistory(item) {
    const host = $("#liab-pay-history");
    if (!host) return;
    const rows = (item.payments || []).slice().reverse().slice(0, 8);
    host.innerHTML = rows.length
      ? rows
          .map(
            (p) =>
              `<li>${escapeHtml(String(p.date || "").slice(0, 10))} · ${yen(p.amount)}${
                p.balanceAfter != null ? ` → 残 ${yen(p.balanceAfter)}` : ""
              }${p.note ? ` · ${escapeHtml(p.note)}` : ""}</li>`
          )
          .join("")
      : `<li class="muted">支払履歴はまだありません</li>`;
  }

  function openLiabEdit(id, focusPay = false) {
    const item = state.liabilities.find((x) => x.id === id);
    if (!item) return;
    const dlg = $("#liab-edit-dialog");
    if (!dlg) return;
    $("#liab-edit-id").value = item.id;
    $("#liab-edit-creditor").value = item.creditor || "";
    $("#liab-edit-kind").value = item.kind || "other";
    $("#liab-edit-balance").value = item.balance ?? "";
    $("#liab-edit-minpay").value = item.minPay == null ? "" : String(item.minPay);
    $("#liab-edit-due").value = item.dueDate || "";
    $("#liab-edit-status").value = item.status || "ok";
    $("#liab-edit-notes").value = item.notes || "";
    $("#liab-pay-date").value = todayISO();
    $("#liab-pay-amount").value = "";
    $("#liab-pay-note").value = "";
    const msg = $("#liab-pay-msg");
    if (msg) msg.textContent = "";
    renderLiabPayHistory(item);
    dlg.showModal();
    if (focusPay) $("#liab-pay-amount")?.focus();
  }

  function applyLiabPayment(item, amount, payDate, payNote) {
    const paid = Number(amount);
    if (!Number.isFinite(paid) || paid <= 0) return { ok: false, error: "支払額を入力してください" };
    const before = Number(item.balance) || 0;
    const after = Math.max(0, before - paid);
    if (!Array.isArray(item.payments)) item.payments = [];
    item.payments.push({
      id: uid(),
      date: payDate || todayISO(),
      amount: paid,
      note: String(payNote || "").trim(),
      balanceAfter: after,
    });
    item.balance = after;
    if (after === 0) item.status = "done";
    else if (item.status === "done") item.status = "plan";
    item.updatedAt = new Date().toISOString();
    return { ok: true, after };
  }

  function renderLiabilities() {
    const list = $("#list-liabilities");
    const summary = $("#liab-summary");
    if (!list) return;
    if (!Array.isArray(state.liabilities)) state.liabilities = [];
    if (!state.fiscalMeta || typeof state.fiscalMeta !== "object") {
      state.fiscalMeta = { defenseLine: null, note: "" };
    }

    const defenseInput = $("#liab-defense");
    const noteInput = $("#liab-defense-note");
    if (defenseInput && document.activeElement !== defenseInput) {
      defenseInput.value =
        state.fiscalMeta.defenseLine == null || Number.isNaN(Number(state.fiscalMeta.defenseLine))
          ? ""
          : String(state.fiscalMeta.defenseLine);
    }
    if (noteInput && document.activeElement !== noteInput) {
      noteInput.value = state.fiscalMeta.note || "";
    }

    const open = state.liabilities.filter((x) => x.status !== "done");
    const balanceTotal = open.reduce((s, x) => s + (Number(x.balance) || 0), 0);
    const mustPay = open.reduce((s, x) => {
      const min = x.minPay == null || x.minPay === "" ? Number(x.balance) || 0 : Number(x.minPay) || 0;
      return s + min;
    }, 0);
    const overdueCount = open.filter((x) => x.status === "overdue").length;
    const defense = state.fiscalMeta.defenseLine;
    const defenseNum = defense == null || defense === "" ? null : Number(defense);

    if (summary) {
      summary.innerHTML = `
        <div class="liab-sum-grid">
          <div><span class="liab-sum-label">未清算残高</span><strong>${yen(balanceTotal)}</strong></div>
          <div><span class="liab-sum-label">今月最低支払合計</span><strong>${yen(mustPay)}</strong></div>
          <div><span class="liab-sum-label">滞納件数</span><strong>${overdueCount}</strong></div>
          <div><span class="liab-sum-label">防衛ライン</span><strong>${
            defenseNum == null || Number.isNaN(defenseNum) ? "未設定" : yen(defenseNum)
          }</strong></div>
        </div>
        <p class="liab-sum-note">${
          defenseNum == null || Number.isNaN(defenseNum)
            ? "防衛ライン＝今月、事業で最低いくら入金が必要かの目安。負債の最低支払を見て設定せよ。"
            : `防衛ライン（事業必達の目安） ${yen(defenseNum)} ／ 負債の今月最低支払 ${yen(mustPay)}。`
        }${state.fiscalMeta.note ? ` · ${escapeHtml(state.fiscalMeta.note)}` : ""}</p>`;
    }

    const rows = state.liabilities
      .slice()
      .sort((a, b) => {
        const rank = { overdue: 0, plan: 1, ok: 2, done: 3 };
        const ra = rank[a.status] ?? 9;
        const rb = rank[b.status] ?? 9;
        if (ra !== rb) return ra - rb;
        return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
      })
      .map((item) => {
        const kind = LIAB_KIND_LABEL[item.kind] || item.kind || "その他";
        const st = LIAB_STATUS_LABEL[item.status] || item.status || "";
        const min =
          item.minPay == null || item.minPay === ""
            ? "—"
            : yen(item.minPay);
        const payCount = (item.payments || []).length;
        const payHint = payCount ? ` · 支払${payCount}回` : "";
        return `<li class="row-item liab-row status-${escapeHtml(item.status || "ok")}" data-liab-id="${item.id}">
          <div class="row-main">
            <strong>${escapeHtml(item.creditor || "（未記入）")} · ${escapeHtml(kind)}</strong>
            <span class="muted">残高 ${yen(item.balance)} · 今月最低 ${min} · 期限 ${escapeHtml(
              item.dueDate || "未設定"
            )} · ${escapeHtml(st)}${payHint}</span>
            ${item.notes ? `<span class="muted">${escapeHtml(item.notes)}</span>` : ""}
          </div>
          <div class="row-actions">
            <button type="button" class="btn ghost compact" data-liab-edit>編集</button>
            ${
              item.status !== "done"
                ? `<button type="button" class="btn ghost compact" data-liab-pay>支払</button>
                   <button type="button" class="btn ghost compact" data-liab-today>今日へ</button>
                   <button type="button" class="btn ghost compact" data-liab-done>清算済</button>`
                : ""
            }
            <button type="button" class="btn ghost compact" data-liab-del>削除</button>
          </div>
        </li>`;
      });
    list.innerHTML = rows.length ? rows.join("") : `<li class="muted">負債はまだありません。滞納・必達から追加せよ。</li>`;

    list.querySelectorAll("[data-liab-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-liab-id]")?.dataset.liabId;
        if (id) openLiabEdit(id, false);
      });
    });
    list.querySelectorAll("[data-liab-pay]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-liab-id]")?.dataset.liabId;
        if (id) openLiabEdit(id, true);
      });
    });
    list.querySelectorAll("[data-liab-today]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-liab-id]")?.dataset.liabId;
        const item = state.liabilities.find((x) => x.id === id);
        if (!item) return;
        addLiabilityTask(item);
      });
    });
    list.querySelectorAll("[data-liab-done]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-liab-id]")?.dataset.liabId;
        const item = state.liabilities.find((x) => x.id === id);
        if (!item) return;
        item.status = "done";
        item.updatedAt = new Date().toISOString();
        save();
        renderLiabilities();
      });
    });
    list.querySelectorAll("[data-liab-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-liab-id]")?.dataset.liabId;
        if (!id || !confirm("この負債を台帳から削除しますか？")) return;
        state.liabilities = state.liabilities.filter((x) => x.id !== id);
        save();
        renderLiabilities();
      });
    });
  }

  function addLiabilityTask(item) {
    const kind = LIAB_KIND_LABEL[item.kind] || "";
    const min =
      item.minPay == null || item.minPay === ""
        ? Number(item.balance) || 0
        : Number(item.minPay) || 0;
    const title = `支払: ${item.creditor || "負債"}（${kind} ${yen(min)}）`;
    let onToday = true;
    if (wipCount() >= 7) onToday = false;
    const task = normalizeTask({
      id: uid(),
      title,
      dueDate: item.dueDate || todayISO(),
      category: "personal",
      horizon: "day",
      urgency: "high",
      importance: "high",
      status: "todo",
      onToday,
      notes: `負債台帳より。残高 ${yen(item.balance)}${item.notes ? ` / ${item.notes}` : ""}`,
      tags: ["liability", "pay"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    state.tasks.push(task);
    save();
    render();
    alert(onToday ? "今日の任務に追加した" : "今日が7件超のため、任務には入れたが今日枠は外した");
  }

  function formatApptWhen(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderAppointments() {
    const list = $("#list-appointments");
    if (!list) return;
    const items = (state.appointments || [])
      .slice()
      .filter((a) => String(a.startAt || "").slice(0, 10) >= todayISO())
      .sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))
      .slice(0, 12);
    list.innerHTML = items.length
      ? items
          .map((a) => {
            const rem = Array.isArray(a.remindersMinutes) ? a.remindersMinutes.join("/") : "";
            return `<li class="row-item">
          <div class="row-main">
            <strong>${escapeHtml(a.title)}</strong>
            <span class="muted">${escapeHtml(formatApptWhen(a.startAt))}〜${escapeHtml(formatApptWhen(a.endAt).split(" ").pop() || "")}${a.location ? ` · ${escapeHtml(a.location)}` : ""}</span>
            ${rem ? `<span class="muted">通知: ${escapeHtml(rem)}分前</span>` : ""}
          </div>
          ${a.gcalHtmlLink ? `<div class="row-actions"><a class="btn ghost compact" href="${escapeHtml(a.gcalHtmlLink)}" target="_blank" rel="noopener">GCal</a></div>` : ""}
        </li>`;
          })
          .join("")
      : `<li class="muted">手帳から登録した予定の控えはまだありません</li>`;
  }

  function formatGcalTimeRange(ev) {
    const start = ev.startAt || "";
    const end = ev.endAt || "";
    // all-day: YYYY-MM-DD only
    if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return "終日";
    const s = formatApptWhen(start);
    const e = formatApptWhen(end);
    const eShort = e.includes(" ") ? e.split(" ").pop() : e;
    return `${s}〜${eShort}`;
  }

  async function refreshGcalToday() {
    const list = $("#list-gcal-today");
    if (!list) return;
    list.innerHTML = `<li class="muted">読み込み中…</li>`;
    try {
      const res = await fetch(`/api/gcal/today?day=${encodeURIComponent(todayISO())}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        list.innerHTML = `<li class="muted">${escapeHtml(body.message || "取得できませんでした")}</li>`;
        return;
      }
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) {
        list.innerHTML = `<li class="muted">本日のGoogle予定はありません</li>`;
        return;
      }
      list.innerHTML = items
        .map(
          (ev) => `<li class="row-item">
          <div class="row-main">
            <strong>${escapeHtml(ev.title || "(無題)")}</strong>
            <span class="muted">${escapeHtml(formatGcalTimeRange(ev))}</span>
          </div>
          ${
            ev.htmlLink
              ? `<div class="row-actions"><a class="btn ghost compact" href="${escapeHtml(ev.htmlLink)}" target="_blank" rel="noopener">開く</a></div>`
              : ""
          }
        </li>`
        )
        .join("");
    } catch {
      list.innerHTML = `<li class="muted">通信エラー</li>`;
    }
  }

  async function refreshGcalStatus() {
    const el = $("#gcal-status");
    const row = $("#gcal-connect-row");
    try {
      const res = await fetch("/api/gcal/status", { headers: authHeaders(), cache: "no-store" });
      const body = await res.json();
      if (!body.configured) {
        if (el) el.textContent = "未設定（GOOGLE_CALENDAR.md）";
        const list = $("#list-gcal-today");
        if (list) list.innerHTML = `<li class="muted">Google連携の設定前です</li>`;
        return body;
      }
      if (el) el.textContent = body.connected ? "接続済み" : "未接続";
      if (row) {
        const btn = $("#btn-gcal-connect");
        if (btn) btn.textContent = body.connected ? "再接続" : "Googleに接続";
      }
      if (body.connected) await refreshGcalToday();
      else {
        const list = $("#list-gcal-today");
        if (list) list.innerHTML = `<li class="muted">未接続です。「Googleに接続」から許可してください</li>`;
      }
      return body;
    } catch {
      if (el) el.textContent = "状態取得失敗";
      return null;
    }
  }

  function localInputToIso(dateStr, timeStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm || 0, 0, 0).toISOString();
  }

  function renderIncidents() {
    const ul = $("#incident-list");
    if (!ul) return;
    const list = todayIncidents();
    ul.innerHTML = list.length
      ? list
          .map(
            (e) => `<li class="row-item" data-id="${e.id}">
        <span class="row-title"><span class="repeat-tag">${escapeHtml(e.type)}</span>${escapeHtml(e.note)}</span>
        <span class="row-actions"><button type="button" data-act="del-incident">消</button></span>
      </li>`
          )
          .join("")
      : '<li class="empty">なし</li>';
    ul.querySelectorAll('[data-act="del-incident"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.closest("[data-id]").dataset.id;
        state.incidents = (state.incidents || []).filter((e) => e.id !== id);
        save();
        renderIncidents();
      });
    });
  }

  /* —— AI尊徳チャット（今日タブ） —— */
  let sontokuBusy = false;
  const sontokuOpeningAttempted = new Set();

  function sontokuChatKey() {
    return `day:${todayISO()}`;
  }

  function getSontokuMessages() {
    const key = sontokuChatKey();
    if (!state.sontokuChat[key]) state.sontokuChat[key] = [];
    return state.sontokuChat[key];
  }

  function pushSontokuMessage(role, text, metadata = {}) {
    const msg = {
      role,
      text: String(text).trim(),
      at: new Date().toISOString(),
      ...metadata,
    };
    if (!msg.text) return;
    getSontokuMessages().push(msg);
    save();
    renderSontokuChat();
  }

  function sontokuContext() {
    const dayTasks = activeTasks().filter(inDay);
    const doneToday = state.tasks.filter(
      (t) => t.status === "done" && String(t.updatedAt || "").slice(0, 10) === todayISO()
    );
    const dayPlan = state.plans[sontokuChatKey()] || {};
    return {
      localTime: new Date().toLocaleString("ja-JP"),
      goal: (dayPlan.goal || "").trim(),
      ifthen: (dayPlan.ifthen || "").trim(),
      habits: habitSummary(dayPlan.habits || {}),
      naisei: dayPlan.naisei || {},
      energy: dayPlan.energy ?? "",
      completedToday: doneToday.length,
      pendingCount: pendingTasks().length,
      kpis: state.kpis[todayISO()] || {},
      tasks: dayTasks.map((task) => ({
        title: stripCategoryPrefix(task.title, task.category || "other", state.categories),
        category: catLabel(task.category || "other"),
        status: task.status,
        dueDate: task.dueDate || "",
        priority: priorityMeta(quadrant(task)).label,
        onToday: !!task.onToday,
        forced: !!task.forced,
      })),
      appointments: (state.appointments || [])
        .filter((a) => {
          const day = String(a.startAt || "").slice(0, 10);
          return day >= todayISO() && day <= addDaysISO(1);
        })
        .slice(0, 12)
        .map((a) => ({
          title: a.title,
          startAt: a.startAt,
          endAt: a.endAt,
        })),
      domainAssessments: window.TaskboardGovernance
        ? window.TaskboardGovernance.assessDomains(state).map((dm) => ({
            id: dm.id,
            name: dm.name,
            status: dm.status,
            score: dm.score,
            summary: dm.summary,
          }))
        : [],
      activeAlerts: window.TaskboardGovernance
        ? window.TaskboardGovernance.getGovernanceAlerts(state)
            .slice(0, 5)
            .map((a) => ({ type: a.type, severity: a.severity, title: a.title, message: a.message }))
        : [],
    };
  }

  function setSontokuStatus(text, stateName = "") {
    const status = $("#sontoku-status");
    if (!status) return;
    status.textContent = text;
    status.dataset.state = stateName;
  }

  function setSontokuBusy(busy) {
    sontokuBusy = busy;
    const input = $("#sontoku-input");
    const send = $("#sontoku-send");
    if (input) input.disabled = busy;
    if (send) {
      send.disabled = busy;
      send.textContent = busy ? "思考中…" : "送る";
    }
    $$(".sontoku-chip").forEach((button) => {
      button.disabled = busy;
    });
    if (busy) setSontokuStatus("Cursorで思考中", "busy");
  }

  async function requestSontoku(payload) {
    const response = await fetch("/api/sontoku", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        date: todayISO(),
        context: sontokuContext(),
        ...payload,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "AI尊徳との接続に失敗しました。");
    }
    return data;
  }

  async function refreshSontokuStatus() {
    try {
      const response = await fetch("/api/sontoku/status", { cache: "no-store", headers: authHeaders() });
      const data = await response.json();
      setSontokuStatus(
        data.connected ? `Cursor接続済み · ${data.model}` : "Cursor APIキー未設定",
        data.connected ? "connected" : "error"
      );
    } catch {
      setSontokuStatus("尊徳サーバー未接続", "error");
    }
  }

  async function ensureSontokuOpening() {
    const key = sontokuChatKey();
    const hasLiveOpening = getSontokuMessages().some(
      (message) => message.provider === "cursor-sdk" && message.kind === "opening"
    );
    if (hasLiveOpening || sontokuOpeningAttempted.has(key) || sontokuBusy) return;
    sontokuOpeningAttempted.add(key);
    setSontokuBusy(true);
    try {
      const data = await requestSontoku({ event: "open" });
      pushSontokuMessage("sontoku", data.reply, {
        provider: "cursor-sdk",
        kind: "opening",
        agentId: data.agentId,
        runId: data.runId,
      });
      window.VoiceService?.speak(data.reply);
      setSontokuStatus(`Cursor接続済み · ${data.model}`, "connected");
    } catch (error) {
      pushSontokuMessage("error", error.message, { provider: "system" });
      setSontokuStatus("接続エラー", "error");
    } finally {
      setSontokuBusy(false);
    }
  }

  // Morning Flow（Phase 3-A）: 起動時→国家状態→AI尊徳→今日の一事→Google予定→25分開始への一本道。
  // 1日1回だけ実処理を行う（ensureSontokuOpening/refreshGcalToday自体は既存どおり毎回呼ばれる）。
  let morningFlowState = { date: null, done: false };

  async function runMorningFlow() {
    const today = todayISO();
    if (morningFlowState.date === today && morningFlowState.done) return;
    morningFlowState.date = today;

    renderGovernanceStatus();
    await ensureSontokuOpening();

    const dayPlan = state.plans[`day:${today}`] || {};
    if (!(dayPlan.goal || "").trim()) {
      $("#day-goal")?.focus();
      $("#day-goal")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    await refreshGcalToday();

    if (window.TaskboardGovernance) {
      const ctx = window.TaskboardGovernance.buildGovernanceContext(state);
      const { topAlert, oneLineSummary } = ctx.governanceSummary;
      const speech = [oneLineSummary, topAlert ? `最重要警報、${topAlert.title}。` : ""].filter(Boolean).join(" ");
      window.VoiceService?.speak(speech);
    }

    $("#pomodoro-bar")?.scrollIntoView({ behavior: "smooth", block: "end" });
    $("#pomo-start")?.focus();

    morningFlowState.done = true;
  }

  function renderSontokuChat() {
    const host = $("#sontoku-messages");
    if (!host) return;
    const msgs = getSontokuMessages();
    host.innerHTML = msgs
      .map(
        (m) =>
          `<div class="sontoku-msg ${["user", "error"].includes(m.role) ? m.role : "sontoku"}"><p>${escapeHtml(m.text).replace(/\n/g, "<br>")}</p></div>`
      )
      .join("");
    host.scrollTop = host.scrollHeight;
  }

  async function sendSontokuUserMessage(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || sontokuBusy) return;
    pushSontokuMessage("user", trimmed, { provider: "local" });
    setSontokuBusy(true);
    try {
      const data = await requestSontoku({ event: "message", message: trimmed });
      pushSontokuMessage("sontoku", data.reply, {
        provider: "cursor-sdk",
        agentId: data.agentId,
        runId: data.runId,
      });
      setSontokuStatus(`Cursor接続済み · ${data.model}`, "connected");
    } catch (error) {
      pushSontokuMessage("error", error.message, { provider: "system" });
      setSontokuStatus("接続エラー", "error");
    } finally {
      setSontokuBusy(false);
      $("#sontoku-input")?.focus();
    }
  }

  function render() {
    renderCurrentDate();
    renderHome();
    renderQuad();
    renderCat();
    renderBoard();
    renderHorizons();
    renderAll();
    renderCalendar();
    updatePomodoroDisplay();
    renderSontokuChat();
    renderIncidents();
    renderInvoices();
    renderPersonalFinance();
    renderLiabilities();
    renderAppointments();
    renderImadarumaProgress();
    renderDoneList();
    renderTrash();
    renderGovernanceStatus();
  }

  function setView(name) {
    $$(".tab").forEach((t) => {
      if (name === "cat" || name === "quad") t.classList.remove("active");
      else t.classList.toggle("active", t.dataset.view === name);
    });
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    if (["day", "week", "month"].includes(name)) loadPlanFields();
    if (name === "day") {
      ensureSontokuOpening();
      refreshGcalToday();
      runMorningFlow();
    }
    render();
  }

  let activeVoice = null;

  function speechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function stopActiveVoice() {
    if (!activeVoice) return;
    try {
      activeVoice.recognition.stop();
    } catch {
      /* ignore */
    }
    if (activeVoice.button) activeVoice.button.classList.remove("listening");
    activeVoice = null;
  }

  function startVoiceInput({ targetInput, button, statusEl, onFinal }) {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      const msg = "このブラウザは声入力非対応です。キーボードのマイクで入力してください。";
      if (statusEl) statusEl.textContent = msg;
      else alert(msg);
      return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      const msg = "声入力はHTTPSまたはlocalhostで使えます。iPhoneはキーボードのマイクでも可。";
      if (statusEl) statusEl.textContent = msg;
      else alert(msg);
      return;
    }

    if (activeVoice && activeVoice.button === button) {
      stopActiveVoice();
      if (statusEl) statusEl.textContent = "中止した";
      return;
    }
    stopActiveVoice();

    const recognition = new Ctor();
    recognition.lang = "ja-JP";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";
    activeVoice = { recognition, button };
    if (button) button.classList.add("listening");
    if (statusEl) statusEl.textContent = "聞いています…";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      const text = (finalText || interim).trim();
      if (targetInput && text) targetInput.value = text;
      if (statusEl) statusEl.textContent = interim ? `認識中: ${interim}` : text ? `「${text}」` : "聞いています…";
    };

    recognition.onerror = (event) => {
      const map = {
        "not-allowed": "マイク許可が必要です",
        "no-speech": "声が聞こえませんでした",
        network: "音声認識ネットワークエラー",
        aborted: "中止した",
      };
      if (statusEl) statusEl.textContent = map[event.error] || `エラー: ${event.error}`;
      if (button) button.classList.remove("listening");
      activeVoice = null;
    };

    recognition.onend = () => {
      if (button) button.classList.remove("listening");
      const text = (finalText || (targetInput && targetInput.value) || "").trim();
      if (statusEl && !statusEl.textContent.startsWith("エラー") && !statusEl.textContent.includes("許可")) {
        statusEl.textContent = text ? `確定: ${text}` : "聞き取れませんでした";
      }
      activeVoice = null;
      if (text && typeof onFinal === "function") onFinal(text);
    };

    try {
      recognition.start();
    } catch {
      if (statusEl) statusEl.textContent = "開始できませんでした";
      if (button) button.classList.remove("listening");
      activeVoice = null;
    }
  }

  function addTaskFromVoiceTitle(title) {
    const clean = stripCategoryPrefix(String(title || "").trim(), "other", state.categories);
    if (!clean) return null;
    let onToday = true;
    if (wipCount() >= 7) onToday = false;
    const task = normalizeTask({
      id: uid(),
      title: clean,
      dueDate: todayISO(),
      category: "other",
      horizon: "day",
      urgency: "high",
      importance: "high",
      status: "todo",
      onToday,
      notes: "声で捕獲",
      tags: ["voice"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    state.tasks.push(task);
    save();
    render();
    return task;
  }

  function openCategoryDialog() {
    const host = $("#category-fields");
    if (!host) return;
    host.innerHTML = state.categories
      .map(
        (c) => `<label class="field">${escapeHtml(c.id)}
          <input type="text" data-cat-id="${c.id}" />
        </label>`
      )
      .join("");
    state.categories.forEach((c) => {
      const input = host.querySelector(`input[data-cat-id="${c.id}"]`);
      if (input) input.value = c.label;
    });
    $("#category-dialog").showModal();
  }

  function saveCategoryDialog() {
    $$("#category-fields input[data-cat-id]").forEach((input) => {
      const id = input.dataset.catId;
      const cat = state.categories.find((c) => c.id === id);
      if (!cat) return;
      const label = input.value.trim();
      if (!label) return;
      cat.label = label.replace(/^【/, "").replace(/】$/, "");
      cat.tag = cat.label;
    });
    save();
    fillCategoryPickers();
    render();
    $("#category-dialog").close();
  }

  function playAlarm(message) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.45, 0.9].forEach((start) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = start === 0.9 ? 660 : 880;
        gain.gain.value = 0.25;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + 0.35);
      });
    } catch {
      /* no audio */
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("統治手帳", { body: message });
    }
  }

  function formatPomoTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updatePomodoroDisplay() {
    const bar = $("#pomodoro-bar");
    if (!bar) return;
    const startBtn = $("#pomo-start");
    const stopBtn = $("#pomo-stop");
    if (!pomodoro.phase) {
      $("#pomo-phase").textContent = "ポモドーロ";
      $("#pomo-task").textContent = "";
      $("#pomo-time").textContent = "25:00";
      bar.classList.remove("running");
      if (startBtn) startBtn.classList.remove("hidden");
      if (stopBtn) stopBtn.classList.add("hidden");
      return;
    }
    bar.classList.add("running");
    if (startBtn) startBtn.classList.add("hidden");
    if (stopBtn) stopBtn.classList.remove("hidden");
    const remaining = pomodoro.endsAt - Date.now();
    $("#pomo-phase").textContent = pomodoro.phase === "work" ? "集中 25分" : "休憩 5分";
    $("#pomo-task").textContent = "";
    $("#pomo-time").textContent = formatPomoTime(remaining);
  }

  function tickPomodoro() {
    if (!pomodoro.phase) return;
    const remaining = pomodoro.endsAt - Date.now();
    if (remaining > 0) {
      updatePomodoroDisplay();
      return;
    }
    if (pomodoro.phase === "work") {
      playAlarm("25分が終わりました。5分休憩です。");
      alert("25分が終わりました。5分休憩に入ります。");
      pomodoro.phase = "break";
      pomodoro.endsAt = Date.now() + POMO_BREAK_MS;
      updatePomodoroDisplay();
      return;
    }
    playAlarm("休憩が終わりました。次のタスクへ。");
    alert("休憩が終わりました。次のタスクへ。");
    stopPomodoro();
  }

  function stopPomodoro() {
    if (pomodoro.timer) clearInterval(pomodoro.timer);
    pomodoro = { phase: null, taskId: null, taskTitle: "", endsAt: null, timer: null };
    updatePomodoroDisplay();
  }

  function startPomodoro() {
    if (pomodoro.timer) clearInterval(pomodoro.timer);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    pomodoro = {
      phase: "work",
      taskId: null,
      taskTitle: "",
      endsAt: Date.now() + POMO_WORK_MS,
      timer: setInterval(tickPomodoro, 1000),
    };
    updatePomodoroDisplay();
  }

  function openEdit(id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    $("#edit-id").value = t.id;
    $("#edit-title").value = t.title;
    $("#edit-category").value = t.category || "other";
    setCatValue("#edit-category", "#edit-cat-tags", t.category || "other");
    $("#edit-horizon").value = t.horizon || "week";
    $("#edit-due").value = t.dueDate || "";
    $("#edit-recurrence").value = t.recurrence || "none";
    $$("input[name=edit-urgency]").forEach((r) => {
      r.checked = r.value === t.urgency;
    });
    $$("input[name=edit-importance]").forEach((r) => {
      r.checked = r.value === t.importance;
    });
    $("#edit-external").checked = !!t.external;
    $("#edit-forced").checked = !!t.forced;
    $("#edit-notes").value = t.notes || "";
    $("#edit-dialog").showModal();
  }

  function scrubStoredTitles() {
    let changed = false;
    state.tasks.forEach((t) => {
      let next = stripCategoryPrefix(t.title || "", t.category || "other", state.categories);
      next = next.replace(/^【発信・強制】\s*/, "");
      if (next !== t.title) {
        t.title = next;
        t.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) save();
  }

  applyHydrated(await bootstrapState());
  fillCategoryPickers();
  scrubStoredTitles();
  ensureForcedMedia();
  ensureForcedAiSync();
  ensureRequiredMonthlyTasks();
  purgeOldTrash();
  refreshGcalStatus();
  if ($("#appt-date")) $("#appt-date").value = todayISO();

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
  $("#btn-back-home").addEventListener("click", () => setView("home"));
  $("#btn-back-home-quad").addEventListener("click", () => setView("home"));
  $("#btn-goto-all").addEventListener("click", () => setView("all"));
  $("#btn-open-calendar").addEventListener("click", () => setView("calendar"));
  $("#btn-calendar-back").addEventListener("click", () => setView("home"));
  $("#btn-edit-categories").addEventListener("click", openCategoryDialog);
  $("#form-categories").addEventListener("submit", (e) => {
    e.preventDefault();
    saveCategoryDialog();
  });
  $("#category-cancel").addEventListener("click", () => $("#category-dialog").close());
  $("#pomo-start").addEventListener("click", startPomodoro);
  $("#pomo-stop").addEventListener("click", stopPomodoro);

  $$(".voice-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.voiceFor);
      if (!input) return;
      startVoiceInput({
        targetInput: input,
        button: btn,
        statusEl: btn.dataset.voiceFor === "la-title" ? $("#la-msg") : $("#new-msg"),
      });
    });
  });

  $("#btn-voice-capture")?.addEventListener("click", () => {
    const btn = $("#btn-voice-capture");
    const status = $("#voice-capture-status");
    startVoiceInput({
      button: btn,
      statusEl: status,
      onFinal: (text) => {
        const task = addTaskFromVoiceTitle(text);
        if (task) {
          status.textContent = task.onToday
            ? `追加: ${task.title}`
            : `追加（今日は満杯のためピン外し）: ${task.title}`;
        }
      },
    });
  });

  $("#incident-add")?.addEventListener("click", () => {
    const note = $("#incident-note").value.trim();
    if (!note) return;
    if (!Array.isArray(state.incidents)) state.incidents = [];
    state.incidents.push({
      id: uid(),
      date: todayISO(),
      type: $("#incident-type").value,
      note,
      createdAt: new Date().toISOString(),
    });
    save();
    $("#incident-note").value = "";
    renderIncidents();
  });

  $("#sontoku-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#sontoku-input");
    const text = input?.value || "";
    if (input) input.value = "";
    sendSontokuUserMessage(text);
  });
  $$(".sontoku-chip").forEach((btn) => {
    btn.addEventListener("click", () => sendSontokuUserMessage(btn.dataset.chip || btn.textContent));
  });

  $("#form-list-new")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#la-title").value.trim();
    const horizon = $("#la-horizon").value;
    const recurrence = $("#la-recurrence").value;
    const dueDate = $("#la-due").value || null;
    if (recurrence !== "none" && !dueDate) {
      alert("繰り返しタスクには、最初の期限を入れてください。");
      return;
    }
    let onToday = $("#la-today").checked || horizon === "day";
    if (onToday && wipCount() >= 7) {
      onToday = false;
      alert("今日・着手中の合計が7件が目安のため、今日ピンは外した。");
    }
    state.tasks.push(
      normalizeTask({
        id: uid(),
        title,
        dueDate,
        category: $("#la-category").value,
        horizon,
        recurrence,
        recurrenceDay: recurrence === "monthly" ? dateFromISO(dueDate)?.getDate() : null,
        urgency: $("input[name=la-urgency]:checked").value,
        importance: $("input[name=la-importance]:checked").value,
        status: $("#la-pending").checked ? "pending" : "todo",
        onToday: $("#la-pending").checked ? false : onToday,
        external: $("#la-external").checked,
        notes: $("#la-notes").value.trim(),
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    save();
    $("#form-list-new").reset();
    $("#la-recurrence").value = "none";
    $("input[name=la-urgency][value=low]").checked = true;
    $("input[name=la-importance][value=high]").checked = true;
    const currentFilterCat = $("#filter-cat")?.value;
    setCatValue("#la-category", "#la-cat-tags", currentFilterCat && currentFilterCat !== "all" ? currentFilterCat : "other");
    render();
    $("#la-msg").textContent = "追加した";
  });

  $("#hide-done").addEventListener("change", renderAll);
  $("#filter-quad").addEventListener("change", renderAll);
  $("#filter-horizon").addEventListener("change", renderAll);
  $("#filter-external")?.addEventListener("change", renderAll);
  $("#calendar-prev").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  $("#calendar-next").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  $("#calendar-today").addEventListener("click", () => {
    const now = new Date();
    calendarCursor = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
  });

  $("#day-save-morning").addEventListener("click", () => {
    const d = todayISO();
    const prev = state.plans[`day:${d}`] || {};
    state.plans[`day:${d}`] = {
      ...prev,
      goal: $("#day-goal").value.trim(),
      ifthen: $("#day-ifthen").value.trim(),
      habits: { ...(prev.habits || {}), ...readHabitChecks("am") },
    };
    syncWeekHabitFromDays();
    save();
    renderGovernanceStatus();
    $("#day-morning-msg").textContent = "朝のジャーナリングを保存した";
  });

  $("#day-save-meta").addEventListener("click", () => {
    const d = todayISO();
    const prev = state.kpis[d] || {};
    state.kpis[d] = {
      ...prev,
      salesTarget: numOrNull("#kpi-sales-target"),
      mediaTarget: numOrNull("#kpi-media-target"),
      sales: numOrNull("#kpi-sales"),
      media: numOrNull("#kpi-media"),
    };
    delete state.kpis[d].health;
    delete state.kpis[d].note;
    delete state.kpis[d].naisei;
    delete state.kpis[d].naiseiTarget;
    save();
    $("#day-meta-msg").textContent = "KPI保存";
  });

  $("#day-save-review").addEventListener("click", () => {
    const d = todayISO();
    const prev = state.plans[`day:${d}`] || {};
    state.plans[`day:${d}`] = {
      ...prev,
      naisei: readNaiseiChecks(),
      good1: $("#good1").value.trim(),
      good2: $("#good2").value.trim(),
      good3: $("#good3").value.trim(),
      grate1: $("#grate1").value.trim(),
      grate2: $("#grate2").value.trim(),
      grate3: $("#grate3").value.trim(),
      lesson: $("#day-lesson").value.trim(),
      tomorrow: $("#day-tomorrow").value.trim(),
      shichitoku: {
        chi: $("#st-chi").value.trim(),
        shin: $("#st-shin").value.trim(),
        jin: $("#st-jin").value.trim(),
        yu: $("#st-yu").value.trim(),
        gen: $("#st-gen").value.trim(),
        mei: $("#st-mei").value.trim(),
        bi: $("#st-bi").value.trim(),
      },
      strength: $("#day-strength").value.trim(),
      habits: { ...(prev.habits || {}), ...readHabitChecks("pm") },
    };
    syncWeekHabitFromDays();
    save();
    $("#day-review-msg").textContent = "夜のジャーナリングを保存した";
  });

  $("#week-save-goal").addEventListener("click", () => {
    const w = weekKey();
    state.plans[`week:${w}`] = {
      ...(state.plans[`week:${w}`] || {}),
      purpose: $("#week-purpose").value.trim(),
      numeric: $("#week-numeric").value.trim(),
      actions: $("#week-actions").value.trim(),
      goal: $("#week-purpose").value.trim(),
      habitDone: $("#week-habit-done").value === "" ? null : Number($("#week-habit-done").value),
      habitTotal: $("#week-habit-total").value === "" ? 7 : Number($("#week-habit-total").value),
      workout: $("#week-workout").value === "" ? null : Number($("#week-workout").value),
      schedulePerfect: $("#week-schedule-perfect").value === "" ? null : Number($("#week-schedule-perfect").value),
    };
    save();
    $("#week-save-msg").textContent = "保存した";
  });
  $("#week-save-review").addEventListener("click", () => {
    const w = weekKey();
    state.plans[`week:${w}`] = { ...(state.plans[`week:${w}`] || {}), review: $("#week-review").value.trim() };
    save();
  });
  $("#month-save-goal").addEventListener("click", () => {
    const m = monthKey();
    state.plans[`month:${m}`] = {
      ...(state.plans[`month:${m}`] || {}),
      purpose: $("#month-purpose").value.trim(),
      numeric: $("#month-numeric").value.trim(),
      actions: $("#month-actions").value.trim(),
      goal: $("#month-purpose").value.trim(),
    };
    save();
  });
  $("#month-save-review").addEventListener("click", () => {
    const m = monthKey();
    state.plans[`month:${m}`] = { ...(state.plans[`month:${m}`] || {}), review: $("#month-review").value.trim() };
    save();
  });
  $("#month-save-board").addEventListener("click", () => {
    readBoardFromDom();
    save();
    renderBoardMetrics();
    $("#month-board-msg").textContent = "ボード保存";
  });

  $("#form-new").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#new-title").value.trim();
    const horizon = $("#new-horizon").value;
    const recurrence = $("#new-recurrence").value;
    const dueDate = $("#new-due").value || null;
    if (recurrence !== "none" && !dueDate) {
      alert("繰り返しタスクには、最初の期限を入れてください。");
      return;
    }
    let onToday = $("#new-today").checked || horizon === "day";
    if (onToday && wipCount() >= 7) {
      onToday = false;
      alert("今日・着手中の合計が7件が目安のため、今日ピンは外した。");
    }
    state.tasks.push(
      normalizeTask({
        id: uid(),
        title,
        dueDate,
        category: $("#new-category").value,
        horizon,
        recurrence,
        recurrenceDay: recurrence === "monthly" ? dateFromISO(dueDate)?.getDate() : null,
        urgency: $("input[name=urgency]:checked").value,
        importance: $("input[name=importance]:checked").value,
        status: $("#new-pending").checked ? "pending" : "todo",
        onToday: $("#new-pending").checked ? false : onToday,
        external: $("#new-external").checked,
        notes: $("#new-notes").value.trim(),
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    save();
    $("#form-new").reset();
    $("#new-recurrence").value = "none";
    $("input[name=urgency][value=low]").checked = true;
    $("input[name=importance][value=high]").checked = true;
    $("#new-msg").textContent = "保存した";
    setView("home");
  });

  $("#form-edit").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = state.tasks.find((x) => x.id === $("#edit-id").value);
    if (!t) return;
    t.title = stripCategoryPrefix($("#edit-title").value.trim(), $("#edit-category").value, state.categories);
    t.category = $("#edit-category").value;
    t.horizon = $("#edit-horizon").value;
    const dueDate = $("#edit-due").value || null;
    const recurrence = $("#edit-recurrence").value;
    if (recurrence !== "none" && !dueDate) {
      alert("繰り返しタスクには、最初の期限を入れてください。");
      return;
    }
    t.dueDate = dueDate;
    t.recurrence = recurrence;
    t.recurrenceDay = recurrence === "monthly" ? dateFromISO(dueDate)?.getDate() : null;
    t.urgency = $("input[name=edit-urgency]:checked").value;
    t.importance = $("input[name=edit-importance]:checked").value;
    t.external = $("#edit-external").checked;
    t.forced = $("#edit-forced").checked;
    if (t.forced) t.tags = [...new Set([...(t.tags || []), "forced"])];
    else t.tags = (t.tags || []).filter((tag) => tag !== "forced");
    t.notes = $("#edit-notes").value.trim();
    t.updatedAt = new Date().toISOString();
    save();
    $("#edit-dialog").close();
    render();
  });
  $("#edit-cancel").addEventListener("click", () => $("#edit-dialog").close());
  $("#edit-delete").addEventListener("click", () => {
    if (!confirm("削除しますか？（ゴミ箱に移動し、7日後に完全削除されます）")) return;
    const t = state.tasks.find((x) => x.id === $("#edit-id").value);
    if (t) {
      t.deletedAt = new Date().toISOString();
      t.updatedAt = t.deletedAt;
    }
    save();
    $("#edit-dialog").close();
    render();
  });

  $("#form-invoice")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!Array.isArray(state.invoices)) state.invoices = [];
    state.invoices.push({
      id: uid(),
      direction: $("#inv-direction").value,
      party: $("#inv-party").value.trim(),
      amount: $("#inv-amount").value === "" ? null : Number($("#inv-amount").value),
      dueDate: $("#inv-due").value || null,
      notes: $("#inv-notes").value.trim(),
      status: "inbox",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    save();
    e.target.reset();
    renderInvoices();
  });

  $("#form-pf")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.personalFinance || typeof state.personalFinance !== "object") {
      state.personalFinance = { entries: [] };
    }
    if (!Array.isArray(state.personalFinance.entries)) state.personalFinance.entries = [];
    state.personalFinance.entries.push({
      id: uid(),
      type: $("#pf-type").value,
      amount: Number($("#pf-amount").value) || 0,
      category: $("#pf-category").value.trim(),
      date: $("#pf-date").value || todayISO(),
      memo: $("#pf-memo").value.trim(),
      createdAt: new Date().toISOString(),
    });
    save();
    e.target.reset();
    if ($("#pf-date")) $("#pf-date").value = todayISO();
    renderPersonalFinance();
  });

  $("#form-liab")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!Array.isArray(state.liabilities)) state.liabilities = [];
    const minRaw = $("#liab-minpay").value;
    state.liabilities.push(
      normalizeLiability({
        id: uid(),
        creditor: $("#liab-creditor").value.trim(),
        kind: $("#liab-kind").value,
        balance: Number($("#liab-balance").value) || 0,
        minPay: minRaw === "" ? null : Number(minRaw),
        dueDate: $("#liab-due").value || null,
        status: $("#liab-status").value || "ok",
        notes: $("#liab-notes").value.trim(),
        payments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    save();
    e.target.reset();
    $("#liab-status").value = "overdue";
    renderLiabilities();
  });

  $("#liab-defense-save")?.addEventListener("click", () => {
    if (!state.fiscalMeta || typeof state.fiscalMeta !== "object") {
      state.fiscalMeta = { defenseLine: null, note: "" };
    }
    const raw = $("#liab-defense").value;
    state.fiscalMeta.defenseLine = raw === "" ? null : Number(raw);
    state.fiscalMeta.note = ($("#liab-defense-note").value || "").trim();
    save();
    const msg = $("#liab-defense-msg");
    if (msg) msg.textContent = "防衛ラインを保存した";
    renderLiabilities();
  });

  $("#liab-edit-cancel")?.addEventListener("click", () => {
    $("#liab-edit-dialog")?.close();
  });

  $("#liab-pay-apply")?.addEventListener("click", () => {
    const id = $("#liab-edit-id").value;
    const item = state.liabilities.find((x) => x.id === id);
    const msg = $("#liab-pay-msg");
    if (!item) return;
    const result = applyLiabPayment(
      item,
      $("#liab-pay-amount").value,
      $("#liab-pay-date").value || todayISO(),
      $("#liab-pay-note").value
    );
    if (!result.ok) {
      if (msg) msg.textContent = result.error;
      return;
    }
    $("#liab-edit-balance").value = item.balance;
    $("#liab-edit-status").value = item.status;
    $("#liab-pay-amount").value = "";
    $("#liab-pay-note").value = "";
    if (msg) msg.textContent = `記録した。残高 ${yen(result.after)}`;
    renderLiabPayHistory(item);
    save();
    renderLiabilities();
  });

  $("#form-liab-edit")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("#liab-edit-id").value;
    const item = state.liabilities.find((x) => x.id === id);
    if (!item) return;
    const minRaw = $("#liab-edit-minpay").value;
    item.creditor = $("#liab-edit-creditor").value.trim();
    item.kind = $("#liab-edit-kind").value;
    item.balance = Number($("#liab-edit-balance").value) || 0;
    item.minPay = minRaw === "" ? null : Number(minRaw);
    item.dueDate = $("#liab-edit-due").value || null;
    item.status = $("#liab-edit-status").value || "ok";
    item.notes = $("#liab-edit-notes").value.trim();
    item.updatedAt = new Date().toISOString();
    save();
    renderLiabilities();
    $("#liab-edit-dialog")?.close();
  });

  $("#btn-gcal-connect")?.addEventListener("click", async () => {
    const status = $("#gcal-status");
    try {
      const res = await fetch("/api/gcal/auth", { headers: authHeaders(), cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        if (status) status.textContent = body.message || "接続開始に失敗";
        alert(body.message || "Google OAuth が未設定です。GOOGLE_CALENDAR.md を見てください。");
        return;
      }
      window.open(body.url, "_blank", "noopener");
      if (status) status.textContent = "ブラウザで許可したあと、再読み込みしてください";
    } catch {
      if (status) status.textContent = "接続開始に失敗";
    }
  });

  $("#btn-gcal-refresh")?.addEventListener("click", () => {
    refreshGcalToday();
  });

  $("#form-appointment")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#appt-msg");
    const title = $("#appt-title").value.trim();
    const date = $("#appt-date").value;
    const start = $("#appt-start").value;
    const end = $("#appt-end").value;
    if (!title || !date || !start || !end) return;
    const startAt = localInputToIso(date, start);
    const endAt = localInputToIso(date, end);
    if (!(new Date(startAt) < new Date(endAt))) {
      alert("終了時刻は開始より後にしてください。");
      return;
    }

    const post = async (force) => {
      if (msg) msg.textContent = force ? "強制登録中…" : "登録中…";
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title,
          startAt,
          endAt,
          location: $("#appt-location").value.trim(),
          notes: $("#appt-notes").value.trim(),
          force: !!force,
        }),
      });
      const body = await res.json().catch(() => ({}));
      return { res, body };
    };

    try {
      let { res, body } = await post(false);
      if (res.status === 409 && body.conflicts?.length) {
        const names = body.conflicts.map((c) => `・${c.title}（${formatApptWhen(c.startAt)}）`).join("\n");
        const ok = confirm(`予定が被っています:\n${names}\n\nそれでも登録しますか？`);
        if (!ok) {
          if (msg) msg.textContent = "登録を中止（バッティング）";
          return;
        }
        ({ res, body } = await post(true));
      }
      if (!res.ok) {
        if (msg) msg.textContent = body.message || "失敗";
        alert(body.message || "予定の登録に失敗しました");
        return;
      }
      if (!Array.isArray(state.appointments)) state.appointments = [];
      state.appointments.push(body.appointment);
      save();
      renderAppointments();
      refreshGcalToday();
      e.target.reset();
      if ($("#appt-date")) $("#appt-date").value = todayISO();
      if ($("#appt-start")) $("#appt-start").value = "10:00";
      if ($("#appt-end")) $("#appt-end").value = "11:00";
      const rem = (body.appointment.remindersMinutes || []).join("/");
      if (msg) {
        msg.textContent = rem
          ? `登録完了（通知 ${rem} 分前）`
          : "登録完了";
      }
    } catch {
      if (msg) msg.textContent = "通信エラー";
    }
  });

  $("#btn-goto-done")?.addEventListener("click", () => setView("done"));
  $("#btn-goto-trash")?.addEventListener("click", () => setView("trash"));
  $("#btn-back-home-done")?.addEventListener("click", () => setView("home"));
  $("#btn-back-home-trash")?.addEventListener("click", () => setView("home"));

  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tosei-techo-${todayISO()}.json`;
    a.click();
  });

  function importStateFromJson(data) {
    if (!data || typeof data !== "object") throw new Error("invalid");
    state.tasks = (Array.isArray(data.tasks) ? data.tasks : []).map(normalizeTask);
    state.plans = data.plans && typeof data.plans === "object" ? data.plans : {};
    state.kpis = data.kpis && typeof data.kpis === "object" ? data.kpis : {};
    state.board = mergeBoard(data.board);
    state.categories = initCategories(data.categories);
    state.sontokuChat = data.sontokuChat && typeof data.sontokuChat === "object" ? data.sontokuChat : {};
    state.incidents = Array.isArray(data.incidents) ? data.incidents : [];
    state.invoices = Array.isArray(data.invoices) ? data.invoices : [];
    state.personalFinance =
      data.personalFinance && typeof data.personalFinance === "object"
        ? { entries: Array.isArray(data.personalFinance.entries) ? data.personalFinance.entries : [] }
        : { entries: [] };
    state.appointments = Array.isArray(data.appointments) ? data.appointments : [];
    state.liabilities = Array.isArray(data.liabilities) ? data.liabilities : [];
    state.fiscalMeta =
      data.fiscalMeta && typeof data.fiscalMeta === "object"
        ? {
            defenseLine:
              data.fiscalMeta.defenseLine == null || data.fiscalMeta.defenseLine === ""
                ? null
                : Number(data.fiscalMeta.defenseLine),
            note: String(data.fiscalMeta.note || ""),
          }
        : { defenseLine: null, note: "" };
    ensureRequiredMonthlyTasks();
    ensureForcedMedia();
    ensureForcedAiSync();
    save();
    loadPlanFields();
    render();
  }

  $("#btn-import").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!confirm("今のデータを、このJSONで上書きしますか？")) return;
        importStateFromJson(data);
        alert("JSONを読み込みました");
        setView("home");
      } catch {
        alert("JSONの形式が正しくありません");
      }
    };
    reader.readAsText(file, "utf-8");
  });

  $("#btn-seed").addEventListener("click", () => {
    const n = window.TASKBOARD_SEED?.tasks?.length || 0;
    if (!confirm(`シード ${n} 件を読み込みますか？`)) return;
    const wipe = confirm("既存を消して入れ直しますか？\nOK＝入れ直し / キャンセル＝追加のみ\n（強制の発信タスクは残します）");
    const added = importSeed({ replace: wipe });
    alert(wipe ? `入れ直した（${n}件＋強制発信）` : `${added} 件追加`);
    setView("home");
  });

  if (state.tasks.filter((t) => !t.forced).length === 0 && window.TASKBOARD_SEED) {
    if (confirm("任務が空です。シードを読み込みますか？")) importSeed({ replace: false });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshFromServerIfNewer();
  });
  window.addEventListener("focus", refreshFromServerIfNewer);

  loadPlanFields();
  render();
  refreshSontokuStatus();

  // GovernanceMonitor（Phase 3-A）: 60秒ごとに未統治警報を再チェックし、新規のものだけ通知する。
  const governanceMonitor =
    window.GovernanceMonitor && window.TaskboardGovernance
      ? window.GovernanceMonitor.createGovernanceMonitor({
          getState: () => state,
          computeAlerts: window.TaskboardGovernance.getGovernanceAlerts,
          onNewAlert: (alert) =>
            window.NotificationService?.notify({
              type: alert.type,
              title: alert.title,
              message: alert.message,
            }),
        })
      : null;
  governanceMonitor?.start();
})();
