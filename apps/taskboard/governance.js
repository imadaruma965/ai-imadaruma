// 五領域による国家状態診断・未統治状態の検知（ルールベース、派生データのみ・state.jsonへは保存しない）
// ブラウザ（<script src="governance.js">）とNode（node:test）の両方から使えるよう、依存を持たない純粋関数として実装する。

(function (root) {
  const GOVERNANCE_DOMAINS = ["personality", "naisei", "diplomacy", "finance", "constitution"];

  const DOMAIN_NAMES = {
    personality: "人格",
    naisei: "内政",
    diplomacy: "外交",
    finance: "財政",
    constitution: "憲法",
  };

  const HABIT_AM_IDS = ["am1", "am2", "am3", "am4", "am5", "am6", "am7", "am8", "am9", "am10"];
  const HABIT_PM_IDS = ["pm1", "pm2", "pm3", "pm4", "pm5", "pm6", "pm7", "pm8"];

  // 今後の通知・音声・AI介入が共通で参照するイベント種別。定義のみ（Phase 2-1ではまだ使用しない）。
  const GovernanceEvent = Object.freeze({
    TODAY_NOT_STARTED: "TODAY_NOT_STARTED",
    TASK_OVERDUE: "TASK_OVERDUE",
    FINANCE_NOT_UPDATED: "FINANCE_NOT_UPDATED",
    SALES_ZERO: "SALES_ZERO",
    NIGHT_REVIEW_MISSING: "NIGHT_REVIEW_MISSING",
  });

  const MORNING_HOUR = 9;
  const NIGHT_HOUR = 21;
  const HABIT_FAILURE_STREAK_DAYS = 3;
  const FINANCE_STALE_DAYS = 3;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function isoFromDate(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function addDaysISO(now, n) {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return isoFromDate(d);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function statusFromScore(score) {
    if (score >= 70) return "stable";
    if (score >= 40) return "caution";
    return "danger";
  }

  function makeAssessment(id, { score, status, summary, reasons, recommendedAction }, now) {
    return {
      id,
      name: DOMAIN_NAMES[id],
      score: clamp(Math.round(score), 0, 100),
      status,
      summary,
      reasons: reasons || [],
      recommendedAction: recommendedAction || null,
      updatedAt: now.toISOString(),
    };
  }

  function unknownAssessment(id, summary, now) {
    return makeAssessment(id, { score: 50, status: "unknown", summary, reasons: [], recommendedAction: null }, now);
  }

  function habitCounts(habits) {
    const map = habits && typeof habits === "object" ? habits : {};
    const amDone = HABIT_AM_IDS.filter((id) => map[id]).length;
    const pmDone = HABIT_PM_IDS.filter((id) => map[id]).length;
    return {
      done: amDone + pmDone,
      total: HABIT_AM_IDS.length + HABIT_PM_IDS.length,
      amDone,
      amTotal: HABIT_AM_IDS.length,
      pmDone,
      pmTotal: HABIT_PM_IDS.length,
    };
  }

  function hasAnyText(...values) {
    return values.some((v) => String(v || "").trim());
  }

  function isNightJournalDone(dayPlan) {
    if (!dayPlan) return false;
    const st = dayPlan.shichitoku || {};
    return hasAnyText(
      st.chi, st.shin, st.jin, st.yu, st.gen, st.mei, st.bi,
      dayPlan.good1, dayPlan.good2, dayPlan.good3, dayPlan.lesson
    );
  }

  function isMorningJournalDone(dayPlan) {
    if (!dayPlan) return false;
    const habits = habitCounts(dayPlan.habits);
    return hasAnyText(dayPlan.ifthen) || habits.amDone > 0;
  }

  function habitFailureStreak(state, now, maxDays) {
    let streak = 0;
    for (let i = 0; i < maxDays; i += 1) {
      const dateISO = addDaysISO(now, -i);
      const dayPlan = (state.plans || {})[`day:${dateISO}`];
      if (!dayPlan) break;
      const { done } = habitCounts(dayPlan.habits);
      if (done > 0) break;
      streak += 1;
    }
    return streak;
  }

  function overdueTasks(state, todayStr) {
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    return tasks.filter(
      (t) => t && !t.deletedAt && t.status !== "done" && t.dueDate && t.dueDate < todayStr
    );
  }

  function financeLastUpdated(state) {
    const stamps = [];
    (state.invoices || []).forEach((inv) => {
      if (inv && inv.updatedAt) stamps.push(String(inv.updatedAt));
    });
    (state.liabilities || []).forEach((item) => {
      if (item && item.updatedAt) stamps.push(String(item.updatedAt));
    });
    ((state.personalFinance || {}).entries || []).forEach((entry) => {
      if (entry && entry.createdAt) stamps.push(String(entry.createdAt));
    });
    if (!stamps.length) return null;
    stamps.sort();
    return stamps[stamps.length - 1];
  }

  function daysBetween(fromISO, toDate) {
    const from = new Date(fromISO);
    if (Number.isNaN(from.getTime())) return null;
    const ms = toDate.getTime() - from.getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  function computeDerived(state, now) {
    const todayStr = isoFromDate(now);
    const yesterdayStr = addDaysISO(now, -1);
    const dayPlan = (state.plans || {})[`day:${todayStr}`] || null;
    const yesterdayPlan = (state.plans || {})[`day:${yesterdayStr}`] || null;
    const kpiToday = (state.kpis || {})[todayStr] || null;
    const habitsToday = habitCounts(dayPlan && dayPlan.habits);
    const naiseiToday = (dayPlan && dayPlan.naisei) || {};

    const overdue = overdueTasks(state, todayStr);
    const overdueExternal = overdue.filter((t) => t.external || t.forced);

    const overdueLiabilities = (state.liabilities || []).filter((item) => item && item.status === "overdue");
    const overdueReceivables = (state.invoices || []).filter(
      (inv) => inv && inv.direction === "in" && inv.status !== "paid" && inv.dueDate && inv.dueDate < todayStr
    );

    const lastFinanceTouch = financeLastUpdated(state);
    const financeStaleDays = lastFinanceTouch ? daysBetween(lastFinanceTouch, now) : null;

    const financeEverTouched =
      (state.invoices || []).length > 0 ||
      ((state.personalFinance || {}).entries || []).length > 0 ||
      (state.liabilities || []).length > 0;

    const chatToday = (state.sontokuChat || {})[`day:${todayStr}`] || [];

    return {
      now,
      todayStr,
      yesterdayStr,
      dayPlan,
      yesterdayPlan,
      kpiToday,
      habitsToday,
      naiseiToday,
      nightJournalDone: isNightJournalDone(dayPlan),
      morningJournalDone: isMorningJournalDone(dayPlan),
      dailyOne: (dayPlan && String(dayPlan.goal || "").trim()) || "",
      overdueTasks: overdue,
      overdueExternalCount: overdueExternal.length,
      overdueLiabilitiesCount: overdueLiabilities.length,
      overdueReceivablesCount: overdueReceivables.length,
      financeStaleDays,
      financeEverTouched,
      habitStreakZero: habitFailureStreak(state, now, HABIT_FAILURE_STREAK_DAYS),
      hasAnyTasksEver: (state.tasks || []).length > 0,
      hasAnyKpiEver: Object.keys(state.kpis || {}).length > 0,
      sontokuMessagesToday: chatToday.length,
    };
  }

  function assessPersonality(d) {
    const hasData = Boolean(d.dayPlan) || d.habitsToday.done > 0;
    if (!hasData) return unknownAssessment("personality", "本日の記録がまだありません。", d.now);

    let score = 60;
    const reasons = [];
    if (d.nightJournalDone) {
      score += 15;
      reasons.push("夜のジャーナリング・七徳チェックを実施済み");
    } else {
      score -= 10;
      reasons.push("夜のジャーナリングが未実施");
    }
    if (d.habitsToday.total > 0) {
      const ratio = d.habitsToday.done / d.habitsToday.total;
      if (ratio >= 0.7) {
        score += 10;
        reasons.push(`習慣達成率が高い（${d.habitsToday.done}/${d.habitsToday.total}）`);
      } else if (ratio < 0.3) {
        score -= 15;
        reasons.push(`習慣達成率が低い（${d.habitsToday.done}/${d.habitsToday.total}）`);
      }
    }
    if (d.habitStreakZero >= HABIT_FAILURE_STREAK_DAYS) {
      score -= 15;
      reasons.push(`${d.habitStreakZero}日連続で習慣が未達`);
    }
    const status = statusFromScore(clamp(score, 0, 100));
    const summary =
      status === "danger"
        ? "習慣・夜のジャーナリングが崩れています。今日はどちらか一つだけ戻してください。"
        : status === "caution"
        ? "夜のジャーナリングか習慣の一部が抜けています。"
        : "人格の柱は安定しています。";
    return makeAssessment(
      "personality",
      { score, status, summary, reasons, recommendedAction: status === "stable" ? null : "夜のジャーナリングを先に埋める" },
      d.now
    );
  }

  function assessNaisei(d) {
    const naiseiCount = Object.values(d.naiseiToday || {}).filter(Boolean).length;
    const hasData = Boolean(d.dayPlan) || d.habitsToday.amDone > 0;
    if (!hasData) return unknownAssessment("naisei", "本日の内政記録がまだありません。", d.now);

    let score = 60;
    const reasons = [];
    if (naiseiCount >= 3) {
      score += 15;
      reasons.push(`内政チェック${naiseiCount}/4を記録`);
    } else if (naiseiCount === 0) {
      score -= 15;
      reasons.push("内政チェック（睡眠・食事・運動・衝動管理）が未記録");
    }
    if (d.morningJournalDone) {
      score += 5;
      reasons.push("朝の習慣・if-thenを記録");
    } else {
      score -= 5;
      reasons.push("朝の習慣が未記録");
    }
    if (d.habitStreakZero >= HABIT_FAILURE_STREAK_DAYS) {
      score -= 15;
      reasons.push(`${d.habitStreakZero}日連続で生活習慣が未記録`);
    }
    const status = statusFromScore(clamp(score, 0, 100));
    const summary =
      status === "danger"
        ? "生活インフラ（睡眠・食事・運動）の記録が崩れています。"
        : status === "caution"
        ? "内政チェックの一部が未記録です。"
        : "内政（生活インフラ）は安定しています。";
    return makeAssessment(
      "naisei",
      { score, status, summary, reasons, recommendedAction: status === "stable" ? null : "内政チェック4項目を埋める" },
      d.now
    );
  }

  function assessDiplomacy(d) {
    if (!d.hasAnyTasksEver && !d.hasAnyKpiEver) {
      return unknownAssessment("diplomacy", "対外的な記録がまだありません。", d.now);
    }
    let score = 70;
    const reasons = [];
    if (d.overdueExternalCount > 0) {
      score -= Math.min(40, d.overdueExternalCount * 10);
      reasons.push(`対外期限超過${d.overdueExternalCount}件`);
    } else {
      reasons.push("対外期限超過なし");
    }
    if (d.kpiToday) {
      if (d.kpiToday.salesTarget != null && (d.kpiToday.sales || 0) >= d.kpiToday.salesTarget) {
        score += 10;
        reasons.push("売上行動KPI達成");
      } else if (d.kpiToday.salesTarget != null) {
        score -= 5;
        reasons.push("売上行動KPI未達");
      }
      if (d.kpiToday.mediaTarget != null && (d.kpiToday.media || 0) >= d.kpiToday.mediaTarget) {
        score += 10;
        reasons.push("発信・連絡KPI達成");
      }
    } else {
      reasons.push("本日の行動KPIが未入力");
    }
    const status = statusFromScore(clamp(score, 0, 100));
    const summary =
      status === "danger"
        ? `対外期限超過${d.overdueExternalCount}件。信用回復を優先してください。`
        : status === "caution"
        ? "対外的な対応に遅れが出ています。"
        : "外交（対外的信用）は安定しています。";
    return makeAssessment(
      "diplomacy",
      { score, status, summary, reasons, recommendedAction: d.overdueExternalCount > 0 ? "期限超過の対外タスクから片付ける" : null },
      d.now
    );
  }

  function assessFinance(d) {
    if (!d.financeEverTouched) {
      return unknownAssessment("finance", "財務の記録がまだありません。", d.now);
    }
    let score = 70;
    const reasons = [];
    if (d.overdueLiabilitiesCount > 0) {
      score -= Math.min(50, d.overdueLiabilitiesCount * 20);
      reasons.push(`支払滞納${d.overdueLiabilitiesCount}件`);
    }
    if (d.overdueReceivablesCount > 0) {
      score -= Math.min(30, d.overdueReceivablesCount * 10);
      reasons.push(`未収請求書${d.overdueReceivablesCount}件が期限超過`);
    }
    if (d.financeStaleDays != null && d.financeStaleDays >= FINANCE_STALE_DAYS) {
      score -= 15;
      reasons.push(`財務記録が${d.financeStaleDays}日更新されていません`);
    }
    if (!reasons.length) reasons.push("滞納・期限超過・更新滞りなし");
    const status = statusFromScore(clamp(score, 0, 100));
    const summary =
      status === "danger"
        ? "支払滞納または未収の期限超過があります。最優先で対応してください。"
        : status === "caution"
        ? "財務記録の更新が滞っています。"
        : "財政は安定しています。";
    return makeAssessment(
      "finance",
      { score, status, summary, reasons, recommendedAction: d.overdueLiabilitiesCount > 0 ? "滞納中の負債から対応する" : null },
      d.now
    );
  }

  function assessConstitution(d) {
    const reasons = [];
    let score;
    let status;
    if (d.dailyOne) {
      score = 75;
      status = "stable";
      reasons.push("今日の一事が設定済み");
    } else {
      score = 40;
      status = "caution";
      reasons.push("今日の一事が未設定");
    }
    reasons.push("『やらない戦』該当判定は現在のデータでは自動判定不可（未実装）");
    const summary =
      status === "stable"
        ? "今日の一事が設定されています。国家目標への接続は自分で確認してください。"
        : "今日の一事が未設定です。国家目標・今期方針への接続を確認してください。";
    return makeAssessment(
      "constitution",
      { score, status, summary, reasons, recommendedAction: status === "stable" ? null : "今日の一事を1つ選ぶ" },
      d.now
    );
  }

  function assessDomains(state, opts) {
    const now = (opts && opts.now) || new Date();
    const d = computeDerived(state || {}, now);
    return [
      assessPersonality(d),
      assessNaisei(d),
      assessDiplomacy(d),
      assessFinance(d),
      assessConstitution(d),
    ];
  }

  function makeAlert(type, { severity, title, message, relatedEntityId, recommendedAction, actionLabel }, now) {
    return {
      type,
      severity,
      title,
      message,
      detectedAt: now.toISOString(),
      relatedEntityId: relatedEntityId || null,
      recommendedAction: recommendedAction || null,
      actionLabel: actionLabel || null,
      dismissed: false,
      resolvedAt: null,
    };
  }

  function detectGovernanceAlerts(state, opts) {
    const now = (opts && opts.now) || new Date();
    const d = computeDerived(state || {}, now);
    const alerts = [];
    const hour = now.getHours();

    if (
      hour >= MORNING_HOUR &&
      !d.morningJournalDone &&
      d.sontokuMessagesToday === 0
    ) {
      alerts.push(
        makeAlert(
          "morning_governance_not_started",
          {
            severity: "caution",
            title: "朝の統治が未開始です",
            message: "if-then・朝の習慣・AI尊徳との対話がまだ記録されていません。",
            recommendedAction: "朝のジャーナリングを開く",
            actionLabel: "朝のジャーナリングへ",
          },
          now
        )
      );
    }

    if (!d.dailyOne) {
      alerts.push(
        makeAlert(
          "daily_one_not_selected",
          {
            severity: "caution",
            title: "今日の一事が未設定です",
            message: "朝のジャーナリングで今日の一事を1つ選んでください。",
            recommendedAction: "今日の一事を設定する",
            actionLabel: "今日の一事を設定",
          },
          now
        )
      );
    } else {
      const related = (state.tasks || []).find(
        (t) => t && !t.deletedAt && t.status === "todo" && t.title && d.dailyOne.includes(t.title)
      );
      if (related) {
        alerts.push(
          makeAlert(
            "daily_one_not_started",
            {
              severity: "caution",
              title: "今日の一事が未着手です",
              message: `「${d.dailyOne}」がまだ着手されていません。`,
              relatedEntityId: related.id,
              recommendedAction: "今日の一事に対応するタスクへ着手する",
              actionLabel: "今日の任務を開く",
            },
            now
          )
        );
      }
    }

    if (d.overdueTasks.length > 0) {
      alerts.push(
        makeAlert(
          "overdue_tasks_exist",
          {
            severity: "urgent",
            title: "期限超過タスクがあります",
            message: `期限超過が${d.overdueTasks.length}件あります。`,
            relatedEntityId: d.overdueTasks[0].id,
            recommendedAction: "期限超過タスクを一覧タブで確認する",
            actionLabel: "一覧を開く",
          },
          now
        )
      );
    }

    const overdueExternalTasks = d.overdueTasks.filter((t) => t.external || t.forced);
    const hasExternalOverdue = overdueExternalTasks.length > 0 || d.overdueLiabilitiesCount > 0 || d.overdueReceivablesCount > 0;
    if (hasExternalOverdue) {
      const parts = [];
      if (overdueExternalTasks.length) parts.push(`対外タスク${overdueExternalTasks.length}件`);
      if (d.overdueLiabilitiesCount) parts.push(`支払滞納${d.overdueLiabilitiesCount}件`);
      if (d.overdueReceivablesCount) parts.push(`未収請求${d.overdueReceivablesCount}件`);
      alerts.push(
        makeAlert(
          "external_obligation_overdue",
          {
            severity: "urgent",
            title: "対外約束の期限超過があります",
            message: `${parts.join("・")}が期限超過です。信用に関わるため最優先で対応してください。`,
            relatedEntityId: overdueExternalTasks[0]?.id || null,
            recommendedAction: "対外約束を優先して片付ける",
            actionLabel: "対応する",
          },
          now
        )
      );
    }

    if (!d.kpiToday || !d.kpiToday.sales) {
      alerts.push(
        makeAlert(
          "sales_action_missing",
          {
            severity: "caution",
            title: "本日の売上行動が未実施です",
            message: "今日の行動KPI（売上行動）がまだ0件です。",
            recommendedAction: "今日の行動KPIを記録する",
            actionLabel: "行動KPIを開く",
          },
          now
        )
      );
    }

    if (d.financeStaleDays != null && d.financeStaleDays >= FINANCE_STALE_DAYS) {
      alerts.push(
        makeAlert(
          "finance_not_updated",
          {
            severity: "caution",
            title: "財務が更新されていません",
            message: `財務が${d.financeStaleDays}日更新されていません。`,
            recommendedAction: "請求書・個人財務・負債台帳を更新する",
            actionLabel: "財務を開く",
          },
          now
        )
      );
    }

    if (hour >= NIGHT_HOUR && !d.nightJournalDone) {
      alerts.push(
        makeAlert(
          "night_review_missing",
          {
            severity: "caution",
            title: "夜のジャーナリングが未完了です",
            message: "七徳チェック・よかったこと・学びのいずれも未記録です。",
            recommendedAction: "夜のジャーナリングを開く",
            actionLabel: "夜のジャーナリングへ",
          },
          now
        )
      );
    }

    if (d.habitStreakZero >= HABIT_FAILURE_STREAK_DAYS) {
      alerts.push(
        makeAlert(
          "repeated_habit_failure",
          {
            severity: "caution",
            title: "習慣未達が連続しています",
            message: `${d.habitStreakZero}日連続で習慣チェックが0件です。`,
            recommendedAction: "今日はどれか1つだけ実施する",
            actionLabel: "習慣チェックを開く",
          },
          now
        )
      );
    }

    // invoice_not_sent: タスク⇄請求書の紐付けデータが存在しないため未実装（推測しない）

    return alerts;
  }

  // 通知・音声・AI尊徳が共通で使う入口。中身は detectGovernanceAlerts と同じ。
  function getGovernanceAlerts(state, opts) {
    return detectGovernanceAlerts(state, opts);
  }

  function pickTopAlert(alerts) {
    if (!alerts.length) return null;
    const severityRank = { urgent: 0, caution: 1, info: 2 };
    return [...alerts].sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3))[0];
  }

  function pickFocusDomain(domains) {
    if (!domains.length) return null;
    const statusRank = { danger: 0, caution: 1, unknown: 2, stable: 3 };
    return [...domains].sort((a, b) => {
      const rank = (statusRank[a.status] ?? 4) - (statusRank[b.status] ?? 4);
      return rank !== 0 ? rank : a.score - b.score;
    })[0];
  }

  function buildOneLineSummary(focusDomain, topAlert) {
    if (!focusDomain) return "国家状態のデータがまだありません。";
    const parts = [];
    if (focusDomain.status === "danger") parts.push(`${focusDomain.name}が危険（${focusDomain.score}点）`);
    else if (focusDomain.status === "caution") parts.push(`${focusDomain.name}に注意（${focusDomain.score}点）`);
    else if (focusDomain.status === "unknown") parts.push("記録が不足している領域があります");
    else parts.push("国家状態は概ね安定");
    if (topAlert) parts.push(`最重要警報は「${topAlert.title}」`);
    return `${parts.join("。")}。`;
  }

  function buildGovernanceSummary(domains, alerts) {
    const topAlert = pickTopAlert(alerts);
    const focusDomain = pickFocusDomain(domains);
    return {
      domainStatusList: domains.map((d) => ({ id: d.id, name: d.name, status: d.status, score: d.score })),
      topAlert: topAlert ? { type: topAlert.type, severity: topAlert.severity, title: topAlert.title } : null,
      focusDomain: focusDomain
        ? { id: focusDomain.id, name: focusDomain.name, status: focusDomain.status, score: focusDomain.score }
        : null,
      oneLineSummary: buildOneLineSummary(focusDomain, topAlert),
    };
  }

  function buildGovernanceContext(state, opts) {
    const now = (opts && opts.now) || new Date();
    const d = computeDerived(state || {}, now);
    const domainAssessments = assessDomains(state, { now });
    const activeAlerts = detectGovernanceAlerts(state, { now });

    const todayTasks = (state.tasks || [])
      .filter((t) => t && !t.deletedAt && t.status !== "done" && (t.onToday || (t.dueDate && t.dueDate <= d.todayStr)))
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate || null,
        forced: !!t.forced,
        external: !!t.external,
      }));

    const calendarSummary = {
      count: (state.appointments || []).filter((a) => String(a?.startAt || "").slice(0, 10) === d.todayStr).length,
      items: (state.appointments || [])
        .filter((a) => {
          const day = String(a?.startAt || "").slice(0, 10);
          return day >= d.todayStr && day <= addDaysISO(now, 1);
        })
        .slice(0, 5)
        .map((a) => ({ title: a.title, startAt: a.startAt })),
    };

    return {
      currentDate: d.todayStr,
      domainAssessments,
      activeAlerts,
      todayTasks,
      dailyOne: d.dailyOne,
      calendarSummary,
      kpi: d.kpiToday || null,
      financeSummary: {
        overdueLiabilities: d.overdueLiabilitiesCount,
        overdueReceivables: d.overdueReceivablesCount,
        staleDays: d.financeStaleDays,
      },
      habitSummary: d.habitsToday,
      governanceSummary: buildGovernanceSummary(domainAssessments, activeAlerts),
    };
  }

  const api = {
    GOVERNANCE_DOMAINS,
    GovernanceEvent,
    assessDomains,
    detectGovernanceAlerts,
    getGovernanceAlerts,
    buildGovernanceContext,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.TaskboardGovernance = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
