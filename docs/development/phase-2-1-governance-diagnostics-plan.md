# Phase 2-1 計画書 — 五領域による国家状態診断 / 未統治状態の検知

- 作成日: 2026-07-24
- 対象アプリ: `apps/taskboard`（統治手帳）
- ステータス: **実装完了・テスト合格（37/37）。§13.1は案A（朝ジャーナルに「今日の一事」入力欄を追加）を採用して実装済み。§13.2はnpm install実施済み、既存テスト14件が実装前に合格していることを確認済み。§18で追加実装（完成分）を記録。**

---

## 1. 背景

統治手帳は現在、タスク・予定・KPI・財務・習慣・ジャーナリングを記録できる。しかし蓄積された情報から「今、国家がどの状態にあるか」を判定する仕組みがない。Phase 2-1では、既存データのみを使ったルールベース診断（五領域：人格・内政・外交・財政・憲法）と、「未統治状態」の検知を追加し、後続フェーズ（通知・音声介入）が使えるデータ構造を用意する。

四柱統治フレームワーク（`constitution/four_pillars.md`, `constitution/domain_mapping.md`）が定義する上位分類は「人格・内政・外交・財政」の四柱であり、「憲法」は柱の一つではなく最高法規そのものである。本Phaseの「五領域」は、この四柱に**日次診断専用の第5項目として「憲法（今日の任務が国家目標・Purpose/Vision/Mission・今期方針・やらない戦と接続しているか）」を追加した、診断機能固有の構成**である。四柱統治フレームワークそのものを変更するものではない。

## 2. 正式スコープ

1. 五領域診断モデル（人格・内政・外交・財政・憲法）の実装（ルールベース、`score`/`status`/`summary`/`reasons`/`recommendedAction`）
2. 未統治状態の検知（10種類のルール。うち1種類は判別不能につき未実装扱い、§9参照）
3. 「今日」画面上部への表示（国家状態バンド、未統治警報。既存UIは無変更）
4. AI尊徳へ渡すコンテキスト生成関数 `buildGovernanceContext()`、および `sontokuContext()`/`normalizeContext()` への安全な追加
5. テスト追加（最低8ケース、既存テストも実行）
6. 計画書本体（本ファイル）

## 3. 非対象（このPhaseではやらない）

- Mac通知・スマホ通知・LINE通知・音声読み上げ・マイク入力の実装
- 受発注管理の本実装
- AI尊徳プロンプトの全面変更
- 四柱統治フレームワーク・じぶん憲法・戦略ドキュメントの変更
- 既存UIコンポーネント（①〜⑦ブロック、KPIボード、負債台帳、請求書、個人財務等）の削除・大規模改修
- 高度なAI推論による診断（ルールベースのみ）
- 警報の「既読/解決」状態の永続化（§8で理由を説明。将来Phaseで追加）

## 4. 既存構造の調査結果（要点）

詳細はセッション内の調査報告を参照。ここでは実装に直結する要点のみ記す。

### 4.1 データ永続化

- 正本は `apps/taskboard/data/state.json`（gitignore対象、自動生成、`{updatedAt, data}` 形式）。
- 読み書きは `server.cjs` の `readStateRecord()` / `writeStateRecord()`（`server.cjs:140-176`）。楽観ロック（`updatedAt`不一致で409）。
- スキーマの防御的検証は `server.cjs` の `sanitizeStateData()`（`110-138`）と `app.js` の `hydrateFromData`/`blankState`（`319-401`）の二重構成。
- フロントは `localStorage`（キー: `imadaruma-gyomu-tochi-v1`）にも保持し、サーバーと同期する。

### 4.2 関連データの所在

| 概念 | 所在 | 備考 |
|---|---|---|
| タスク | `state.tasks[]` | `dueDate`（`YYYY-MM-DD`）, `status`("todo/doing/done/pending"), `forced`, `external`, `deletedAt` |
| 予定・約束 | `state.appointments[]` | Googleカレンダー連携 |
| 日次計画・ジャーナル | `state.plans["day:YYYY-MM-DD"]` | `ifthen`(朝), `habits`(am/pm統合), `naisei`(内政4項目), `good1-3`, `grate1-3`, `lesson`, `tomorrow`, `shichitoku`(七徳7項目), `strength`(夜) |
| 週・月の目的 | `state.plans["week:YYYY-Www"].purpose`, `state.plans["month:YYYY-MM"].purpose` | `goal`は`purpose`の旧名として併存 |
| KPI | `state.kpis["YYYY-MM-DD"]` | `{salesTarget, mediaTarget, sales, media}` |
| KPIボード（月次） | `state.board.{finance,diplomacy,naisei}[id]` | `BOARD_DEFS`（`app.js:29-52`）が定義 |
| 請求書 | `state.invoices[]` | `direction`("in"/"out"), `status`("inbox"→"paid"), `dueDate`, `updatedAt` |
| 個人財務 | `state.personalFinance.entries[]` | `type`("in"/"out"), `amount`, `date`, `createdAt`（`updatedAt`なし） |
| 負債 | `state.liabilities[]` | `status`("overdue"/"plan"/"ok"/"done"、**ユーザーが手動選択**)、`dueDate`, `updatedAt`, `payments[]` |
| 財政防衛ライン | `state.fiscalMeta.defenseLine` | |
| AI尊徳チャット | `state.sontokuChat["day:YYYY-MM-DD"]` | セッション自体は別ファイル `.sontoku-sessions.json` |
| 習慣定義 | `HABIT_AM`(`app.js:124-135`), `HABIT_PM`(`137-146`) | 集計関数 `habitSummary()`(`1636-1649`) |

### 4.3 AI尊徳連携の既存パターン

- フロント `sontokuContext()`（`app.js:2196-2233`）がその日の状況（目標・習慣・完了数・タスク等）をまとめ、`/api/sontoku` にPOST。
- サーバー `normalizeContext()`（`server.cjs:227-260`）がサイズ上限つきで再検証し、`basePrompt()`/`turnPrompt()`（`278-332`）がプロンプトに注入。
- **拡張パターンはこの経路がそのまま使える**：`sontokuContext()`に新キーを追加し、`normalizeContext()`に対応するサニタイズを追加するだけでよい。プロンプト本文の全面変更は不要（軽微な追記のみ許容範囲）。

### 4.4 UI構成

- 「今日」画面は `index.html:135-355`、番号見出し①〜⑦（尊徳／予定／今日の任務／朝ジャーナル／KPI／国難ログ／夜ジャーナル）。
- 挿入候補位置: `index.html:137`（`.day-flow-hint`）の直後、`.day-workbench`（139行目）より前。既存の①〜⑦体系を崩さない。
- 既存の警報バンドの実例: `#pending-banner`（`index.html:53`、`.warn.hidden`トグル方式）。新規UIもこのパターンを踏襲する。
- `render()`（`app.js:2347-2366`）が全描画関数を呼ぶハブ。ここに `renderGovernanceStatus()` を追加する。

### 4.5 テスト・Lint

- テストランナー: Node標準 `node:test` + `node:assert/strict`。実行: `npm run test:taskboard`（`node --test apps/taskboard/server.test.cjs`）。
- `app.js` 側ロジックのテストは現状ゼロ。
- Lint/型チェックのスクリプトはリポジトリに存在しない（TypeScript未使用）。
- **現状、ルートに `node_modules` が未インストールのため `npm run test:taskboard` は `@cursor/sdk` 解決エラーで失敗する（環境未整備。コードの不具合ではない）。実装着手前に `npm install` を行い、クリーンな既存テスト合格を確認したい（§13で許可を確認）。**

## 5. データモデル

新規ファイル `apps/taskboard/governance.js` に、状態(`state`)を受け取り診断結果を返す**純粋関数**として実装する（副作用なし、`state.json`のスキーマは変更しない＝派生データ）。

### 5.1 五領域ID（既存命名との整合）

`board`（KPIボード）が既に `finance`/`diplomacy`/`naisei` というromaji idを使っているため、五領域診断でも同じidを再利用し、新規に人格・憲法分を追加する。

```js
const GOVERNANCE_DOMAINS = ["personality", "naisei", "diplomacy", "finance", "constitution"];
// 人格=personality, 内政=naisei, 外交=diplomacy, 財政=finance, 憲法=constitution
```

### 5.2 DomainAssessment

```ts
{
  id: "personality" | "naisei" | "diplomacy" | "finance" | "constitution",
  name: string,          // "人格" 等、日本語表示名
  score: number,         // 0-100
  status: "stable" | "caution" | "danger" | "unknown",
  summary: string,       // 一行理由（UI表示用）
  reasons: string[],     // 加点/減点の根拠一覧
  recommendedAction: string | null,
  updatedAt: string,     // ISO、診断実行時刻
}
```

### 5.3 GovernanceAlert

```ts
{
  type: string,               // "overdue_tasks_exist" 等、§9の10種
  severity: "info" | "caution" | "urgent",
  title: string,
  message: string,
  detectedAt: string,         // ISO
  relatedEntityId: string | null,   // 該当タスク/請求書/負債のid
  recommendedAction: string | null,
  actionLabel: string | null,
  dismissed: false,           // Phase 2-1では常にfalse固定（§8参照）
  resolvedAt: null,           // Phase 2-1では常にnull固定（§8参照）
}
```

### 5.4 公開関数

```js
assessDomains(state, { now } = {}) -> DomainAssessment[]   // 5件、順序固定
detectGovernanceAlerts(state, { now } = {}) -> GovernanceAlert[]
buildGovernanceContext(state, { now } = {}) -> {
  currentDate, domainAssessments, activeAlerts,
  todayTasks, dailyOne, calendarSummary, kpi,
  financeSummary, habitSummary,
}
```

`now`は注入可能（テスト容易性のため。デフォルトは`new Date()`）。

### 5.5 モジュール形式

`app.js`はブラウザ用IIFE（`require`なし）、`server.cjs`はNode CommonJS。両方から使う必要はないが、**テスト（node:test）からrequireできる形にする**ため、`seed-data.js`（`window.TASKBOARD_SEED = {...}`という素朴なグローバル代入、`.js`拡張子でNodeからも`require`可能）と同じ流儀で実装する：

```js
// 末尾
if (typeof module !== "undefined" && module.exports) {
  module.exports = { assessDomains, detectGovernanceAlerts, buildGovernanceContext, GOVERNANCE_DOMAINS };
}
if (typeof window !== "undefined") {
  window.TaskboardGovernance = { assessDomains, detectGovernanceAlerts, buildGovernanceContext, GOVERNANCE_DOMAINS };
}
```

`index.html`で`seed-data.js`と同じ位置（`app.js`より前）に`<script src="governance.js"></script>`を追加。`app.js`からは`window.TaskboardGovernance.assessDomains(state)`のように呼ぶ。`server.cjs`はこのファイルを`require`しない（診断はフロント計算、サーバーは`normalizeContext`の枠を広げるだけ）。

## 6. 判定ルール（五領域）

いずれも `state`・当日日付・現在時刻のみから計算する。データが存在しない項目は加減点せず`reasons`に記載しない。加点/減点材料が一切ない領域は`status: "unknown"`, `score: 50`（中立値）とし、`summary`に「データ不足」と明記する。

### 人格 (personality)
- 夜ジャーナル完了（`shichitoku`いずれか非空 or `good1-3`いずれか非空）：+
- 国難ログ（`incidents[]`）に「復帰記録」（同日以降のインシデントに解決記録がある）：+
- 習慣達成率（`habitSummary`の`done/total`）が閾値未満（例: <0.5）が続く：−
- データなし → unknown

### 内政 (naisei)
- 当日`naisei`（睡眠/食事/運動/衝動）チェックの充足率：+/−
- 当日habits(am/pm)の記録有無：+/−
- 連続未記録（複数日 `naisei`/`habits`が空）：−

### 外交 (diplomacy)
- `external:true`のタスクで期限超過なし：+
- 期限超過タスク（`dueDate < today && status !== "done" && !deletedAt`、`external`優先集計）：−
- `state.kpis[today]`の営業/発信KPI（`sales`/`media`）達成：+

### 財政 (finance)
- `finance_not_updated`検知（§9）が発火していない：+
- 支払期限超過（`liabilities[].status === "overdue"`）：大幅−
- 未収・入金遅延（`invoices[]`で`direction==="in" && status!=="paid" && dueDate<today`）：−

### 憲法 (constitution)
- 「今日の一事」が国家目標/今期方針に接続しているかは自動判定不可のため、**「今日の一事が設定されているか」のみを機械判定材料とし、接続の質はunknown**とする（§13の決定待ち）。
- 「やらない戦」該当タスクへの着手は既存データに識別子がないため**判定不可＝unknown**（`tags`等に将来識別子を追加すれば拡張可能、Phase 2-1では実装しない）。

## 7. 未統治検知ルール

| type | severity目安 | 判定式（案） | 出典フィールド |
|---|---|---|---|
| `morning_governance_not_started` | caution | 当日9:00以降 かつ `ifthen`空 かつ AM habits全未実施 かつ `sontokuChat[today]`メッセージ0件 | `plans[day].ifthen`, `plans[day].habits`, `sontokuChat[day]` |
| `daily_one_not_selected` | caution | §13の決定待ち | `plans[day].goal`（**書き込みUIが現状存在しない**） |
| `daily_one_not_started` | caution | §13の決定待ち（`daily_one_not_selected`が前提） | 同上 |
| `overdue_tasks_exist` | urgent | `tasks[]`に`dueDate<today && status!=="done" && !deletedAt`が1件以上 | `state.tasks[]` |
| `external_obligation_overdue` | urgent | 上記のうち`external===true`、または`liabilities[].status==="overdue"`、または未収請求書の期限超過 | `state.tasks[]`, `state.liabilities[]`, `state.invoices[]` |
| `sales_action_missing` | caution | `state.kpis[today]`が存在しない、または`sales===0` | `state.kpis[day]` |
| `finance_not_updated` | caution | `max(invoices[].updatedAt, personalFinance.entries[].createdAt, liabilities[].updatedAt)`が閾値日数（既定3日）以上前 | 複数（§4.2参照、統一`updatedAt`フィールドが無いため最大値を計算） |
| `invoice_not_sent` | — | **未実装**（§9で理由説明） | — |
| `night_review_missing` | caution | 当日21:00以降 かつ 夜ジャーナル項目（`naisei`/`good1-3`/`lesson`/`tomorrow`/`shichitoku`/`strength`）が全て空 | `plans[day]` |
| `repeated_habit_failure` | caution | 直近N日（既定3日）連続で`habitSummary(habits).done===0` | `plans["day:*"].habits` |

時刻閾値（9:00 / 21:00）と連続日数閾値（3日）は`governance.js`内の定数として一箇所にまとめ、後で調整しやすくする。

## 8. 警報の状態管理について

ユーザー指定の`GovernanceAlert`スキーマには`dismissed`/`resolvedAt`が含まれるが、Phase 2-1の対象UIは「現在検知されているものだけ表示」（既読・解除UIは仕様に含まれない）。よって：

- Phase 2-1では`dismissed`は常に`false`、`resolvedAt`は常に`null`を返す（スキーマ形状のみ用意し、値は固定）
- 警報は`state.json`に保存しない（§5準拠、完全な派生データ）
- 既読・解除の永続化（`state.json`への保存 or 別ファイル）は、通知機能を実装する次Phaseで設計する

## 9. `invoice_not_sent` を実装しない理由

「納品・受注済みだが未請求」を判定するには、納品完了とその請求書発行の間の紐付けが必要だが、`state.tasks[]`と`state.invoices[]`の間にリレーション（`relatedTaskId`等）が存在しない。ユーザー指示「現在のデータで判別不能なら未実装扱いとし、推測しない」に従い、Phase 2-1では実装せず、`detectGovernanceAlerts()`はこのtypeを返さない。次Phaseでタスク⇄請求書の紐付けフィールドを追加すれば実装可能。

## 10. UI変更

`index.html:137`の直後（`.day-workbench`より前）に以下を追加する。既存の①〜⑦ブロックは変更しない。

```html
<div id="governance-status" class="governance-status hidden">
  <div class="governance-domains"><!-- 5領域、renderGovernanceStatus()が描画 --></div>
  <div class="governance-alerts"><!-- 未統治警報、最大3件+「すべて見る」 --></div>
</div>
```

- `app.js`に`renderGovernanceStatus()`を追加し、`render()`（`2347`）と`setView("day")`（`2375`付近）から呼ぶ。`#pending-banner`と同じ`hidden`トグル方式。
- 領域ごとに状態・点数・一行理由（`summary`）を表示。`status`に応じて`--ok`/`--warn`/新設`--danger`のCSSクラスを付与。
- 警報は`severity`降順（urgent→caution→info）で最大3件表示、残りは折りたたみ（`<details>`要素で既存パターンに近い簡易実装）。
- `styles.css`に`--danger`変数（既存`--warn`/`--ok`と同系統で新設）と`.governance-status`関連の最小限のスタイルを追加。

## 11. AI尊徳との接続準備

- `apps/taskboard/app.js`の`sontokuContext()`（`2196-2233`）に`domainAssessments`（5件の要約: id/status/score/summaryのみ、reasons等の詳細は送らない）と`activeAlerts`（type/severity/titleのみ、最大5件）を追加。
- `server.cjs`の`normalizeContext()`（`227-260`）に対応するサニタイズ（配列長・文字列長の上限）を追加。**プロンプト本文（`basePrompt`/`turnPrompt`）は変更しない**（ユーザー指示「全面変更は行わない」に従い、コンテキストJSONへの追加のみ）。
- `buildGovernanceContext()`は`sontokuContext()`とは別関数として`governance.js`に置き、`sontokuContext()`内部から呼び出す形にして重複を避ける。

## 12. 保存方式

- 診断結果・警報は**保存しない**（毎回`state`から計算する派生データ）。
- `state.json`のスキーマは変更しない（新規トップレベルキーを追加しない）。§13の決定次第で「今日の一事」用に`plans[day].goal`への書き込みUIを追加する場合も、**フィールド自体は既存スキーマに既に存在する**ため、`sanitizeStateData`/`hydrateFromData`の変更は不要と見込む。

## 13. リスク・要決定事項

### 13.1【要決定】「今日の一事」の書き込みUIが存在しない

調査の結果、`plans[day].goal`は`sontokuContext()`（`app.js:2204`）が読み取る先として**コード上に存在する**が、これを書き込むUI・保存処理は`app.js`/`index.html`全体を検索しても**見つからなかった**。週・月には`purpose`入力欄（`week-purpose`/`month-purpose`）があるが、日次には対応する入力欄がない。近い概念として「夜ジャーナルの`tomorrow`（翌日へ渡す一事）」があるのみ。

このままでは`daily_one_not_selected`は**毎日必ず発火し続ける**（`goal`が構造的に常に空のため）。これは「検知として正しい」とも言えるが、UIから解消する手段がないまま警報だけが出続けることになる。

対応案（いずれかを選択いただきたい）：

- **案A（推奨）**: Phase 2-1のスコープ内で、朝ジャーナル（④）に最小限の「今日の一事」入力欄を1つ追加し、`plans[day].goal`に保存する（既存の`tomorrow`から前日値を初期値として引き継ぐ）。既存UIの削除・大幅変更はなく、追加のみ。これにより`daily_one_not_selected`/`daily_one_not_started`が意味を持つ。
- **案B**: 入力UIは追加せず、`tomorrow`（前日夜に設定した翌日の一事）を`goal`の代理値として読む。ただし前日未設定なら結局常に空。
- **案C**: `daily_one_not_selected`/`daily_one_not_started`はPhase 2-1では実装せず、次Phase（UI拡張とセットで）に先送りする。

### 13.2 環境未整備によるテスト未実行

`node_modules`未インストールのため、既存テスト（`server.test.cjs`）が実行できていない（`@cursor/sdk`解決エラー）。実装着手前に`npm install`を行い、既存テストが実装前から通ることを確認したい。

### 13.3 その他リスク

- 時刻閾値（9:00/21:00）・連続日数閾値（3日）はユーザー指示に具体的数値の指定がないため仮値。運用しながら調整可能なよう定数化する。
- `finance_not_updated`は財務全体を束ねる単一の`updatedAt`が存在しないため、複数フィールドの最大値で近似する（`personalFinance.entries`に`updatedAt`が無く`createdAt`で代用）。編集操作（削除等）が`createdAt`に反映されない特性は許容する。
- `app.js`側ロジックのテストが現状皆無のため、`governance.js`を独立ファイル・純粋関数として切り出すことがテスト容易性の前提になる。既存の`app.js`本体への影響は「呼び出しの追加」のみに留める。

## 14. 後方互換性

- `state.json`のスキーマ変更なし（§13.1で案Aを選ぶ場合も、既存の`plans[day].goal`フィールドを使うのみで新規キー追加なし）。
- 既存の①〜⑦ブロック、KPIボード、負債台帳、請求書、個人財務、AI尊徳チャットは無変更。
- 新規追加はすべて「既存になければ空扱い」で安全に動作する（`unknown`ステータス、警報非発火がデフォルト）。
- 旧`state.json`（`governance`関連キーを一切含まないもの）を読み込んでもエラーにならない。

## 15. 変更予定ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `apps/taskboard/governance.js` | 新規 | 診断・検知の純粋関数群 |
| `apps/taskboard/governance.test.cjs` | 新規 | 上記のユニットテスト（8ケース以上） |
| `apps/taskboard/app.js` | 変更 | `renderGovernanceStatus()`追加、`render()`/`setView`から呼び出し、`sontokuContext()`拡張 |
| `apps/taskboard/index.html` | 変更 | `<script src="governance.js">`追加、`#governance-status`DOM追加（+ §13.1案A採用時は朝ジャーナルに「今日の一事」入力欄追加） |
| `apps/taskboard/server.cjs` | 変更 | `normalizeContext()`に`domainAssessments`/`activeAlerts`のサニタイズ追加 |
| `apps/taskboard/styles.css` | 変更 | `--danger`変数、`.governance-status`関連スタイル追加 |
| `apps/taskboard/server.test.cjs` | 変更なし（想定） | 既存テストの動作確認のみ |
| `package.json` | 変更 | `test:taskboard`スクリプトに`governance.test.cjs`を追加 |
| `docs/development/phase-2-1-governance-diagnostics-plan.md` | 新規（本ファイル） | 本計画書 |

## 16. テスト計画

`apps/taskboard/governance.test.cjs`（`node:test`、`server.test.cjs`と同じ流儀）：

1. `assessDomains()`が常に5領域すべてを返す（順序固定）
2. データ不足の領域が`status: "unknown"`になる
3. 期限超過タスクがあると`diplomacy`または`finance`の`score`が下がる
4. `daily_one_not_selected`（§13.1の決定後の仕様）を検知する
5. `finance_not_updated`を検知する（`liabilities`/`invoices`/`personalFinance`の日付操作）
6. `dismissed`固定仕様により、解決済み扱いの警報が`activeAlerts`に出ない（該当条件を満たさなくなったら配列から消えることの確認）
7. 壊れた/欠損した`state`（旧データ、キー欠落）を渡しても例外を投げず、安全なデフォルトを返す
8. `buildGovernanceContext()`が期待するキー一式を返す

既存の`server.test.cjs`（`npm run test:taskboard`経由）もあわせて実行し、合格を確認する。UIの手動確認（「今日」画面で5領域・警報が表示され、既存①〜⑦が壊れていないこと）はブラウザで目視確認する。

## 17. 次Phaseへの接続

- 診断結果・警報を使ったMac通知・スマホ通知・LINE通知・音声読み上げ・マイク入力の実装
- 警報の既読/解決状態の永続化設計
- `invoice_not_sent`の実装（タスク⇄請求書のリレーション追加後）
- 「憲法」領域における「やらない戦」該当判定（タスクへの識別子付与後）
- AI尊徳プロンプトの本格的な文脈拡張（国家状態を踏まえた語りかけの調整）
- 受発注管理の本実装

## 18. 追加実装（Phase 2-1完成分）

ユーザー指示「Phase 2-1を完成させる」に基づき、既存実装を壊さない追加のみで以下を実装した（大規模リファクタリングなし）。

### 18.1 国家状態カードの表示位置変更
`index.html`の`#governance-status`を、`<h2 class="section-title">今日の計画</h2>`より前、`#view-day`セクションの最初の子要素に移動した（画面最上部）。DOM操作を行うJS側（`app.js`の`renderGovernanceStatus()`）は`#governance-domains`/`#governance-alerts`というidを参照するのみで、位置に依存しないため変更不要だった。

### 18.2 領域カードへの理由・AI尊徳提案の表示
`renderGovernanceStatus()`（`app.js`）で、各`DomainAssessment`の`reasons`を最大2件、`recommendedAction`を1行、カード内に追加表示するようにした。情報過多を避けるため件数を制限し、`styles.css`に`.governance-domain-reasons`（小さい箇条書き）・`.governance-domain-action`（太字1行）を追加した。

### 18.3 `buildGovernanceContext()`への`governanceSummary`追加
`governance.js`に以下を追加し、`buildGovernanceContext()`の返り値へ`governanceSummary`として組み込んだ。

```ts
governanceSummary: {
  domainStatusList: { id, name, status, score }[],  // 国家状態一覧
  topAlert: { type, severity, title } | null,        // 最重要警報（urgent > caution > infoの順で最初の1件）
  focusDomain: { id, name, status, score } | null,    // 本日の重点領域（danger > caution > unknown > stableの順、同順位はscore昇順）
  oneLineSummary: string,                             // AI尊徳への一行要約（例: "財政が危険（35点）。最重要警報は「期限超過タスクがあります」。"）
}
```

### 18.4 NotificationService（`apps/taskboard/notification-service.js`、新規）
`notify()` / `schedule()` / `cancel()` のインターフェースのみ。中身は`console.log`と`{ok, stub:true, ...}`の返却のみで、実通知は行わない。`governance.js`と同じ isomorphic 形式（`window.NotificationService` / `module.exports`）。

### 18.5 VoiceService（`apps/taskboard/voice-service.js`、新規）
`speak()` はブラウザの`SpeechSynthesis`が使える場合のみ実際に読み上げ、使えない場合（Node環境含む）は`console.log`スタブにフォールバックする。`listen()` / `stop()` はインターフェースのみ（`listen()`は常に`not_implemented`を返す。マイク入力の本実装は次Phase）。`stop()`はSpeechSynthesis利用時のみ`speechSynthesis.cancel()`を呼ぶ。

### 18.6 `getGovernanceAlerts()`（`governance.js`）
`detectGovernanceAlerts()`と同じ結果を返す薄いラッパー。通知・音声・AI尊徳が今後共通で呼び出す入口として用意した。`app.js`の`sontokuContext()`/`renderGovernanceStatus()`もこちらを呼ぶよう統一した。

### 18.7 GovernanceEvent（`governance.js`）
```js
GovernanceEvent = Object.freeze({
  TODAY_NOT_STARTED, TASK_OVERDUE, FINANCE_NOT_UPDATED, SALES_ZERO, NIGHT_REVIEW_MISSING
})
```
定義のみ。既存の`detectGovernanceAlerts()`が返す`type`文字列（`morning_governance_not_started`等）へは接続していない（指示通り、まだ使用しない）。今後、通知・音声・AI介入を共通イベント化する際の型として使う想定。

### 18.8 変更ファイル一覧（追加分）
新規: `apps/taskboard/notification-service.js`, `apps/taskboard/notification-service.test.cjs`, `apps/taskboard/voice-service.js`, `apps/taskboard/voice-service.test.cjs`
変更: `apps/taskboard/governance.js`, `apps/taskboard/governance.test.cjs`, `apps/taskboard/app.js`, `apps/taskboard/index.html`, `apps/taskboard/styles.css`, `package.json`

### 18.9 テスト
`governance.test.cjs`に4件追加（`getGovernanceAlerts`の一致確認、`GovernanceEvent`の内容とfreeze確認、`governanceSummary`が最悪領域と最重要警報を正しく拾うこと、警報が0件のときの安全な既定値）。`notification-service.test.cjs`（3件）・`voice-service.test.cjs`（4件）を新規追加。`npm run test:taskboard`は37/37合格。
