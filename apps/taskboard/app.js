(() => {
  const STORAGE_KEY = "imadaruma-gyomu-tochi-v1";
  const TARGET_DATE = "2026-12-09";

  const CATEGORIES = [
    { id: "fres", label: "フレスト", tag: "【フレスト】" },
    { id: "lex", label: "レックス", tag: "【レックス】" },
    { id: "sound", label: "sound", tag: "【sound】" },
    { id: "media", label: "発信", tag: "【発信】" },
    { id: "write", label: "執筆", tag: "【執筆】" },
    { id: "ds", label: "DS", tag: "【DS】" },
    { id: "design", label: "デザイン", tag: "【デザイン】" },
    { id: "invest", label: "投資", tag: "【投資】" },
    { id: "personal", label: "個人", tag: "【個人】" },
    { id: "other", label: "その他", tag: "【その他】" },
  ];

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
    2: { pub: "【発信・強制】火・人格カルーセル 配信日", prep: "【発信・強制】火・人格カルーセル 制作（配信2日前）" },
    3: { pub: "【発信・強制】水・内政カルーセル 配信日", prep: "【発信・強制】水・内政カルーセル 制作（配信2日前）" },
    4: { pub: "【発信・強制】木・外交カルーセル 配信日", prep: "【発信・強制】木・外交カルーセル 制作（配信2日前）" },
    5: { pub: "【発信・強制】金・財政カルーセル 配信日", prep: "【発信・強制】金・財政カルーセル 制作（配信2日前）" },
    0: { pub: "【発信・強制】日・ニュースレター 配信日", prep: "【発信・強制】日・NL制作（配信2日前＝金）" },
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function todayISO() {
    const d = new Date();
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
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

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

  function normalizeTask(t) {
    return {
      ...t,
      category: t.category || inferCategory(t.title),
      horizon: t.horizon || "week",
      urgency: t.urgency === "high" ? "high" : "low",
      importance: t.importance === "high" ? "high" : "low",
      tags: Array.isArray(t.tags) ? t.tags : [],
      forced: !!t.forced,
    };
  }

  function load() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = localStorage.getItem("imadaruma-taskboard-v2") || localStorage.getItem("imadaruma-taskboard-v1");
      if (!raw) return blankState();
      const data = JSON.parse(raw);
      return {
        tasks: (Array.isArray(data.tasks) ? data.tasks : []).map(normalizeTask),
        reviews: data.reviews || {},
        plans: data.plans || {},
        kpis: data.kpis || {},
        board: mergeBoard(data.board),
      };
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
    return { tasks: [], reviews: {}, plans: {}, kpis: {}, board: defaultBoard() };
  }

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks: state.tasks,
        reviews: state.reviews,
        plans: state.plans,
        kpis: state.kpis,
        board: state.board,
      })
    );
  }

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

  const state = load();
  let openCategory = null;

  function catLabel(id) {
    return (CATEGORIES.find((c) => c.id === id) || { label: id }).label;
  }

  function catTag(id) {
    return (CATEGORIES.find((c) => c.id === id) || { tag: `【${id}】` }).tag;
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

  function mountCatPicker(tagsSel, hiddenSel, { includeAll = false, initial = "other" } = {}) {
    const wrap = $(tagsSel);
    const hidden = $(hiddenSel);
    if (!wrap || !hidden) return;
    const items = includeAll
      ? [{ id: "all", tag: "すべて", extra: "tag-all" }, ...CATEGORIES]
      : CATEGORIES;
    wrap.innerHTML = items
      .map((c) => `<button type="button" class="cat-tag tag-${c.id}" data-cat="${c.id}">${c.tag}</button>`)
      .join("");
    wrap.querySelectorAll(".cat-tag").forEach((btn) => {
      btn.addEventListener("click", () => {
        setCatValue(hiddenSel, tagsSel, btn.dataset.cat);
        if (includeAll) renderAll();
      });
    });
    setCatValue(hiddenSel, tagsSel, hidden.value || initial);
  }

  function fillCategoryPickers() {
    mountCatPicker("#new-cat-tags", "#new-category", { initial: "other" });
    mountCatPicker("#edit-cat-tags", "#edit-category", { initial: "other" });
    mountCatPicker("#filter-cat-tags", "#filter-cat", { includeAll: true, initial: "all" });
  }

  function ensureForcedMedia() {
    const now = new Date();
    const dow = now.getDay(); // 0 Sun … 6 Sat
    const today = todayISO();
    const in2 = addDaysISO(2);
    const dowIn2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getDay();

    const ensure = (title, due) => {
      let t = state.tasks.find((x) => x.title === title && x.status !== "done");
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.tasks.push(t);
      } else {
        t.forced = true;
        t.category = "media";
        if (due === today) t.onToday = true;
        t.dueDate = due;
        t.horizon = "day";
        t.urgency = "high";
        t.importance = "high";
      }
    };

    if (MEDIA_FORCE[dow]) ensure(MEDIA_FORCE[dow].pub, today);
    if (MEDIA_FORCE[dowIn2]) ensure(MEDIA_FORCE[dowIn2].prep, today);

    // keep today pinned forced ≤ slightly over limit is ok for media force
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
    save();
    ensureForcedMedia();
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
    return state.tasks.filter((t) => t.status !== "done");
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
    const pill = `<span class="row-cat tag-${cat}">${catTag(cat)}</span>`;
    const q = { uu: "I", un: "III", nu: "II", nn: "IV" }[quadrant(t)];
    return `<li class="row-item border-${cat} ${t.status === "done" ? "done" : ""} ${t.forced ? "forced" : ""}" data-id="${t.id}">
      <span class="dot dot-${cat}"></span>
      <span class="row-title">${pill}${force}${escapeHtml(t.title)}</span>
      <span class="row-meta">${q}${t.dueDate ? " · " + t.dueDate.slice(5) : ""}</span>
      <span class="row-actions">
        ${t.status !== "done" ? `<button type="button" data-act="done">完</button>` : `<button type="button" data-act="undone">戻</button>`}
        ${!t.onToday && t.status !== "done" ? `<button type="button" data-act="today">今日</button>` : ""}
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
          t.status = "done";
          t.onToday = false;
        } else if (act === "undone") {
          t.status = "todo";
        } else if (act === "today") {
          const count = state.tasks.filter((x) => x.onToday && x.status !== "done").length;
          if (count >= 7 && !t.forced) {
            alert("今日は7件が目安です。");
            return;
          }
          t.onToday = true;
          t.horizon = "day";
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

  function renderHome() {
    const grid = $("#cat-overview");
    const counts = {};
    CATEGORIES.forEach((c) => {
      counts[c.id] = 0;
    });
    activeTasks().forEach((t) => {
      const id = t.category || "other";
      counts[id] = (counts[id] || 0) + 1;
    });
    grid.innerHTML = CATEGORIES.map((c) => {
      const n = counts[c.id] || 0;
      if (n === 0 && !["fres", "lex", "sound", "media", "personal"].includes(c.id)) {
        // still show zero for main ones only? show all with 0 muted
      }
      return `<button type="button" class="cat-card" data-cat="${c.id}">
        <div class="name"><span class="dot dot-${c.id}"></span>${c.label}</div>
        <div class="num">${n}</div>
        <div class="meta">未完了</div>
      </button>`;
    }).join("");
    grid.querySelectorAll(".cat-card").forEach((card) => {
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
    let list = [...state.tasks];
    if (hideDone) list = list.filter((t) => t.status !== "done");
    if (fq !== "all") list = list.filter((t) => quadrant(t) === fq);
    if (fc !== "all") list = list.filter((t) => (t.category || "other") === fc);
    if (fh !== "all") list = list.filter((t) => (t.horizon || "week") === fh);
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "done" ? 1 : -1;
      return (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title);
    });
    fillList("#list-all", list);
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
    $("#day-goal").value = dayPlan.goal || "";
    $("#day-ifthen").value = dayPlan.ifthen || "";
    $("#day-energy").value = dayPlan.energy ?? "";
    $("#good1").value = dayPlan.good1 || "";
    $("#good2").value = dayPlan.good2 || "";
    $("#good3").value = dayPlan.good3 || "";
    $("#grate1").value = dayPlan.grate1 || "";
    $("#grate2").value = dayPlan.grate2 || "";
    $("#grate3").value = dayPlan.grate3 || "";
    $("#day-lesson").value = dayPlan.lesson || "";
    $("#day-tomorrow").value = dayPlan.tomorrow || "";
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
    $("#kpi-sales").value = kpi.sales ?? "";
    $("#kpi-media").value = kpi.media ?? "";
    $("#kpi-health").value = kpi.health || "";
    $("#kpi-note").value = kpi.note || "";
    renderBoardMetrics();
  }

  function render() {
    renderHome();
    renderCat();
    renderBoard();
    renderHorizons();
    renderAll();
  }

  function setView(name) {
    $$(".tab").forEach((t) => {
      if (name === "cat") t.classList.remove("active");
      else t.classList.toggle("active", t.dataset.view === name);
    });
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    if (["day", "week", "month"].includes(name)) loadPlanFields();
    render();
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
    $$("input[name=edit-urgency]").forEach((r) => {
      r.checked = r.value === t.urgency;
    });
    $$("input[name=edit-importance]").forEach((r) => {
      r.checked = r.value === t.importance;
    });
    $("#edit-notes").value = t.notes || "";
    $("#edit-dialog").showModal();
  }

  fillCategoryPickers();
  ensureForcedMedia();

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
  $("#btn-back-home").addEventListener("click", () => setView("home"));
  $("#btn-goto-all").addEventListener("click", () => setView("all"));

  $("#hide-done").addEventListener("change", renderAll);
  $("#filter-quad").addEventListener("change", renderAll);
  $("#filter-horizon").addEventListener("change", renderAll);

  $("#day-save-morning").addEventListener("click", () => {
    const d = todayISO();
    state.plans[`day:${d}`] = {
      ...(state.plans[`day:${d}`] || {}),
      goal: $("#day-goal").value.trim(),
      ifthen: $("#day-ifthen").value.trim(),
      energy: $("#day-energy").value === "" ? null : Number($("#day-energy").value),
    };
    save();
    $("#day-morning-msg").textContent = "朝を保存した";
  });

  $("#day-save-meta").addEventListener("click", () => {
    const d = todayISO();
    state.kpis[d] = {
      sales: $("#kpi-sales").value === "" ? null : Number($("#kpi-sales").value),
      media: $("#kpi-media").value === "" ? null : Number($("#kpi-media").value),
      health: $("#kpi-health").value.trim(),
      note: $("#kpi-note").value.trim(),
    };
    save();
    $("#day-meta-msg").textContent = "KPI保存";
  });

  $("#day-save-review").addEventListener("click", () => {
    const d = todayISO();
    state.plans[`day:${d}`] = {
      ...(state.plans[`day:${d}`] || {}),
      good1: $("#good1").value.trim(),
      good2: $("#good2").value.trim(),
      good3: $("#good3").value.trim(),
      grate1: $("#grate1").value.trim(),
      grate2: $("#grate2").value.trim(),
      grate3: $("#grate3").value.trim(),
      lesson: $("#day-lesson").value.trim(),
      tomorrow: $("#day-tomorrow").value.trim(),
    };
    save();
    $("#day-review-msg").textContent = "夕を保存した";
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
    let onToday = $("#new-today").checked || horizon === "day";
    if (onToday && state.tasks.filter((x) => x.onToday && x.status !== "done").length >= 7) {
      onToday = false;
      alert("今日は7件が目安のため、今日ピンは外した。");
    }
    state.tasks.push(
      normalizeTask({
        id: uid(),
        title,
        dueDate: $("#new-due").value || null,
        category: $("#new-category").value,
        horizon,
        urgency: $("input[name=urgency]:checked").value,
        importance: $("input[name=importance]:checked").value,
        status: "todo",
        onToday,
        notes: $("#new-notes").value.trim(),
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
    save();
    $("#form-new").reset();
    $("input[name=urgency][value=low]").checked = true;
    $("input[name=importance][value=high]").checked = true;
    $("#new-msg").textContent = "保存した";
    setView("home");
  });

  $("#form-edit").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = state.tasks.find((x) => x.id === $("#edit-id").value);
    if (!t) return;
    t.title = $("#edit-title").value.trim();
    t.category = $("#edit-category").value;
    t.horizon = $("#edit-horizon").value;
    t.dueDate = $("#edit-due").value || null;
    t.urgency = $("input[name=edit-urgency]:checked").value;
    t.importance = $("input[name=edit-importance]:checked").value;
    t.notes = $("#edit-notes").value.trim();
    t.updatedAt = new Date().toISOString();
    save();
    $("#edit-dialog").close();
    render();
  });
  $("#edit-cancel").addEventListener("click", () => $("#edit-dialog").close());
  $("#edit-delete").addEventListener("click", () => {
    if (!confirm("削除しますか？")) return;
    state.tasks = state.tasks.filter((x) => x.id !== $("#edit-id").value);
    save();
    $("#edit-dialog").close();
    render();
  });

  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gyomu-tochi-${todayISO()}.json`;
    a.click();
  });

  function importStateFromJson(data) {
    if (!data || typeof data !== "object") throw new Error("invalid");
    state.tasks = (Array.isArray(data.tasks) ? data.tasks : []).map(normalizeTask);
    state.plans = data.plans && typeof data.plans === "object" ? data.plans : {};
    state.kpis = data.kpis && typeof data.kpis === "object" ? data.kpis : {};
    state.board = mergeBoard(data.board);
    ensureForcedMedia();
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

  loadPlanFields();
  render();
})();
