# Phase 3-A 計画書 — 「AIが朝の統治へ参加する」

- 作成日: 2026-07-24
- 対象アプリ: `apps/taskboard`（統治手帳）
- 前提: Phase 2-1（五領域診断・未統治検知・NotificationService/VoiceServiceのインターフェース）を維持し、既存機能を壊さない追加実装のみ行う。
- ステータス: **実装完了・テスト合格（46/46）。§4.3の設計判断はユーザー確認済み（開始ボタンへの誘導のみを採用、自動開始はしない）。**

---

## 1. 事前確認（作業前ルール）

### 1.1 git status
`apps/taskboard/*`（5ファイル変更）・`package.json`が未ステージ、Phase 2-1で作成した新規ファイル群（`governance.js`系、`notification-service.*`、`voice-service.*`）と`docs/`が未追跡。いずれも本セッションでの成果物で、ユーザーの指示通り未コミットのまま。working treeは「クリーン」ではないが、これは前Phaseからの継続であり、他者の変更が混入している状態ではない。

### 1.2 変更確認
Phase 2-1の差分（`git diff --stat`）: `app.js`(+69) `index.html`(+11) `server.cjs`(+17) `styles.css`(+75) `package.json`(+1/-1)。新規: `governance.js`/`governance.test.cjs`/`notification-service.js`/`notification-service.test.cjs`/`voice-service.js`/`voice-service.test.cjs`。

### 1.3 docs確認
`docs/development/phase-2-1-governance-diagnostics-plan.md`を再読。§18（追加実装分）まで反映済み。本ファイルはその続きとして新規作成する（1Phase=1計画書の原則を踏襲）。

### 1.4 Phase 2-1との整合確認（現在のAPI・実装状態を実ファイルから再確認）

- `governance.js`が公開する関数: `GOVERNANCE_DOMAINS`, `GovernanceEvent`（定義のみ・未接続）, `assessDomains(state, {now})`, `detectGovernanceAlerts(state, {now})`, `getGovernanceAlerts(state, {now})`（`detectGovernanceAlerts`と同一）, `buildGovernanceContext(state, {now})`（`governanceSummary`を含む）。ブラウザでは`window.TaskboardGovernance`。
- `notification-service.js`: `NotificationService.notify()/schedule()/cancel()`は現状すべて`console.log`のみのスタブ。ブラウザでは`window.NotificationService`。
- `voice-service.js`: `VoiceService.speak()`は`window.SpeechSynthesisUtterance`が使える場合は実際に発話し、使えなければスタブ。`listen()`は常に`not_implemented`。`stop()`は発話中断のみ実装済み。ブラウザでは`window.VoiceService`。
- `app.js`: `renderGovernanceStatus()`が「今日」画面最上部の`#governance-status`に5領域＋警報を描画（`render()`から毎回呼ばれる）。`sontokuContext()`は`window.TaskboardGovernance.getGovernanceAlerts()`を使い`activeAlerts`をAI尊徳へ渡している。`ensureSontokuOpening()`は日付ごとに1回だけAI尊徳の開始挨拶を取得し、`state.sontokuChat`に保存する（`kind:"opening"`の既存メッセージがあれば再取得しない）。`setView("day")`は`["day","week","month"].includes(name)`で`loadPlanFields()`、`name==="day"`で`ensureSontokuOpening()`と`refreshGcalToday()`を呼ぶ。既定表示タブは`#view-home`（「全体」）であり「今日」タブではない。
- ブラウザ通知の先例が既にコードに存在する: `playAlarm()`（`app.js`）が`typeof Notification !== "undefined" && Notification.permission === "granted"`で`new Notification(...)`を送り、`startPomodoro()`が`Notification.permission === "default"`のとき`Notification.requestPermission()`をボタンクリック（ユーザー操作）内で呼んでいる。Phase 3-AのNotificationServiceもこの既存パターンを踏襲する。

---

## 2. 正式スコープ

1. `NotificationService.notify()`を実際のBrowser Notification APIへ接続し、未統治警報を通知する。
2. `VoiceService.speak()`（既存の本実装）を実際に呼び出し、AI尊徳の朝の挨拶・警報・今日の重点を読み上げる。
3. Morning Flow（起動時→国家状態→AI尊徳→今日の一事→Google予定→25分開始、への一本道の導線）を追加する。
4. `GovernanceMonitor`（60秒ごとに`getGovernanceAlerts()`を実行し、新規警報のみ`NotificationService`へ渡す）を追加する。
5. テスト追加。既存テスト（37件）を壊さない。
6. 本計画書。

## 3. 非対象

- `NotificationService.schedule()`/`cancel()`の実装（下記§4.4で理由を説明。インターフェースのまま）
- `VoiceService.listen()`の実装（マイク入力は既存スコープ外のまま）
- 25分ポモドーロの自動開始（下記§4.3で理由を説明。ユーザー確認したい設計判断）
- LINE通知・スマホ通知・Mac専用通知（Browser Notification API以外）
- AI尊徳プロンプト本文（`basePrompt`/`turnPrompt`）の変更
- `GovernanceEvent`を実際の警報typeへ接続する対応（Phase 2-1同様、定義のみ据え置き）
- 既存UIレイアウト・既存ボタンの削除や大規模な並び替え

## 4. 実装設計

### 4.1 NotificationService（`apps/taskboard/notification-service.js`変更）

`notify(payload)`を次のように変更する。`schedule()`/`cancel()`は変更しない。

```js
notify(payload) {
  const title = (payload && payload.title) || "統治手帳";
  const body = (payload && payload.message) || "";
  if (typeof Notification === "undefined") {
    console.log("[NotificationService.notify] Notification API未対応、スタブ", payload);
    return { ok: true, method: "stub", payload };
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body, tag: payload?.type || undefined });
    return { ok: true, method: "browser-notification", payload };
  }
  if (Notification.permission === "default") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") new Notification(title, { body, tag: payload?.type || undefined });
    });
    return { ok: true, method: "permission-requested", payload };
  }
  console.log("[NotificationService.notify] 通知許可が拒否されています", payload);
  return { ok: false, method: "denied", payload };
}
```

`tag: payload.type`を付けることで、同種の警報が短時間に重複しても既存の通知UIをOSレベルでも自然に置き換えられる（`GovernanceMonitor`側の重複排除と二重の安全網）。

### 4.2 VoiceServiceの実配線（`apps/taskboard/app.js`変更、`voice-service.js`自体は変更なし）

- **朝の挨拶**: `ensureSontokuOpening()`の成功時（`pushSontokuMessage("sontoku", data.reply, ...)`の直後）に`window.VoiceService?.speak(data.reply)`を追加する。この関数は既に「日付ごとに1回だけ」ガードされているため、挨拶の読み上げも自然に1日1回になる。
- **警報・今日の重点**: Morning Flow（§4.3）の最終ステップで、`buildGovernanceContext()`の`governanceSummary.oneLineSummary`と`governanceSummary.topAlert.title`をまとめて1回だけ読み上げる。`renderGovernanceStatus()`（`render()`から毎回呼ばれる関数）の中では読み上げない＝保存のたびに音声が鳴るのを防ぐ。

### 4.3 Morning Flow（`apps/taskboard/app.js`に`runMorningFlow()`新設）

```js
let morningFlowState = { date: null, done: false };

async function runMorningFlow() {
  const today = todayISO();
  if (morningFlowState.date === today && morningFlowState.done) return;
  morningFlowState.date = today;

  renderGovernanceStatus();               // ① 国家状態
  await ensureSontokuOpening();           // ② AI尊徳（挨拶の読み上げは4.2で内蔵）

  const dayPlan = state.plans[`day:${today}`] || {};
  if (!(dayPlan.goal || "").trim()) {     // ③ 今日の一事
    $("#day-goal")?.focus();
    $("#day-goal")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  await refreshGcalToday();               // ④ Google予定

  if (window.TaskboardGovernance) {       // 警報・重点の読み上げ
    const ctx = window.TaskboardGovernance.buildGovernanceContext(state);
    const { topAlert, oneLineSummary } = ctx.governanceSummary;
    const speech = [oneLineSummary, topAlert ? `最重要警報、${topAlert.title}。` : ""].filter(Boolean).join(" ");
    window.VoiceService?.speak(speech);
  }

  $("#pomodoro-bar")?.scrollIntoView({ behavior: "smooth", block: "end" }); // ⑤ 25分開始への導線
  $("#pomo-start")?.focus();

  morningFlowState.done = true;
}
```

呼び出し箇所: 既存の`setView("day")`内、`ensureSontokuOpening(); refreshGcalToday();`の2行はそのまま残し（毎回のタブ切り替えで予定を更新する既存挙動を壊さない）、その直後に`runMorningFlow()`を追加で呼ぶ。`runMorningFlow()`は1日1回しか実処理をしないガードを持つため、2回目以降のタブ切り替えでは即returnする。

**設計判断（ご確認ください）**: 「25分開始」で終わる一本道、という指示を、①ポモドーロ開始ボタンへスクロール＋フォーカスするところまで（クリックはユーザーに委ねる）と解釈した。理由:
- `Notification.requestPermission()`や`AudioContext`の自動再生は、多くのブラウザでユーザー操作（クリック等）を起点にしないと機能しない／ブロックされる。`runMorningFlow()`はタブ切り替え後の非同期処理チェーンの中で動くため、`startPomodoro()`を自動実行しても通知許可やアラーム音が正しく機能しない可能性が高い。
- 用事があって「今日」タブを開いただけの場合に、無確認でタイマーが走り出すのは意図しない挙動になりうる。
- ボタンへの導線（スクロール＋フォーカス）までを自動化すれば「一本道」の体験は維持しつつ、実際にタイマーを開始する最終アクションはユーザーの意思決定として残せる。

もし「実際に25分タイマーまで自動起動してほしい」という意図であれば、`runMorningFlow()`の最終ステップを`startPomodoro()`の呼び出しに変更する（1行の変更で対応可能）。

### 4.4 GovernanceMonitor（`apps/taskboard/governance-monitor.js`新規）

```js
function createGovernanceMonitor({ getState, computeAlerts, onNewAlert, now, intervalMs } = {}) {
  const period = intervalMs || 60000;
  let previousKeys = new Set();
  let timer = null;

  function alertKey(alert) {
    return `${alert.type}:${alert.relatedEntityId || ""}`;
  }

  function checkNow() {
    if (typeof getState !== "function" || typeof computeAlerts !== "function") return [];
    const state = getState();
    const nowValue = typeof now === "function" ? now() : new Date();
    const alerts = computeAlerts(state, { now: nowValue }) || [];
    const currentKeys = new Set(alerts.map(alertKey));
    const newAlerts = alerts.filter((a) => !previousKeys.has(alertKey(a)));
    previousKeys = currentKeys;
    if (newAlerts.length && typeof onNewAlert === "function") newAlerts.forEach((a) => onNewAlert(a));
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
```

**「新しいAlertのみ」の定義**: 直前のチェック結果との差分（`type + relatedEntityId`をキーとする集合の差）とする。state.jsonへは何も保存しない（Phase 2-1の「警報は派生データ、保存しない」方針を維持）。そのため、一度消えた警報が再び発生した場合は「新規」として再通知される。ページを再読み込みすると監視の記憶はリセットされる（`sontokuOpeningAttempted`など既存の同種ガードと同じ性質）。

`app.js`側の配線（IIFE末尾、`render(); refreshSontokuStatus();`の付近に追加）:

```js
const governanceMonitor = window.GovernanceMonitor && window.TaskboardGovernance
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
```

**`schedule()`/`cancel()`を実装しない理由**: `GovernanceMonitor`が60秒間隔のポーリングそのものを担っており、時刻指定の予約が今回のスコープに存在しないため。時刻指定通知（例: 「21時に夜レビュー未完了なら通知」など）が必要になった時点で`schedule()`/`cancel()`を実装する。

## 5. 変更予定ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `apps/taskboard/notification-service.js` | 変更 | `notify()`をBrowser Notification APIへ接続 |
| `apps/taskboard/notification-service.test.cjs` | 変更 | 新しい`notify()`の分岐（API未対応/許可済み/未確認/拒否）のテストに更新 |
| `apps/taskboard/governance-monitor.js` | 新規 | `createGovernanceMonitor()` |
| `apps/taskboard/governance-monitor.test.cjs` | 新規 | 重複排除・start/stop・異常系のテスト |
| `apps/taskboard/app.js` | 変更 | `runMorningFlow()`新設、`ensureSontokuOpening()`に音声読み上げ追加、`setView("day")`から`runMorningFlow()`呼び出し、`GovernanceMonitor`の起動配線 |
| `apps/taskboard/index.html` | 変更 | `<script src="governance-monitor.js">`追加 |
| `package.json` | 変更 | `test:taskboard`に`governance-monitor.test.cjs`追加（`notification-service.test.cjs`は既存） |
| `docs/development/phase-3-a-ai-morning-participation-plan.md` | 新規（本ファイル） | 本計画書 |

`governance.js`・`voice-service.js`・`styles.css`・`server.cjs`は変更なしの見込み（Morning Flowはスクロール／フォーカスのみでCSSクラス新設は不要と判断）。

## 6. テスト計画

- `notification-service.test.cjs`: ①`Notification`未定義環境でスタブへフォールバック ②`Notification.permission==="granted"`で通知が送られる（グローバルに疑似`Notification`クラスを一時定義して検証） ③`"default"`で`requestPermission()`が呼ばれる ④`"denied"`で送られない
- `governance-monitor.test.cjs`: ①初回`checkNow()`で全件が「新規」として`onNewAlert`に渡る ②同じ警報が続く2回目の`checkNow()`では呼ばれない ③一度消えて再度出た警報は再び「新規」扱いになる ④`start()`/`stop()`が実タイマーで正しく動く（短い`intervalMs`で検証） ⑤`getState`/`computeAlerts`未設定でも例外を投げない
- 既存37件（`server.test.cjs`/`governance.test.cjs`/`voice-service.test.cjs`/変更後の`notification-service.test.cjs`）が引き続き合格することを確認する。
- ブラウザでの手動確認: 「今日」タブを開いた際に、国家状態→AI尊徳挨拶（音声）→今日の一事欄へフォーカス→Google予定更新→警報読み上げ→ポモドーロ開始ボタンへスクロール、という順序が壊れていないか確認する。この環境ではヘッドレスブラウザが使えないため、前回同様サーバー起動とAPI往復・ロジック直接実行で代替検証し、可能な範囲で報告する。

## 7. リスク

- Node環境（`node:test`）には`window`/`Notification`/`speechSynthesis`が存在しないため、実ブラウザでの動作は目視確認できない（前回Phaseと同じ制約）。ロジックの分岐はテストとNode直接実行で検証する。
- `runMorningFlow()`の「25分開始」を自動クリックにしない設計判断は、指示の解釈次第で変わりうる（§4.3で確認事項として明記）。
- `Notification.requestPermission()`をユーザー操作なしの非同期チェーン内から呼ぶ可能性があるため、ブラウザによっては許可ダイアログが出ない・ブロックされることがある。これは実ブラウザの仕様であり、コード側の不具合ではない。

## 8. 後方互換性

- `state.json`のスキーマ変更なし（Phase 2-1同様、警報・監視結果は保存しない）。
- 既存の①〜⑦ブロック、KPIボード、負債台帳、請求書、個人財務、AI尊徳チャット、ポモドーロ、Googleカレンダー連携は無変更。
- `NotificationService.schedule()`/`cancel()`・`VoiceService.listen()`の呼び出し側は存在しないため、インターフェースのまま据え置いても影響なし。
