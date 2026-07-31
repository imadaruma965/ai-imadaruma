# 統治手帳「内閣」ゲートウェイ — 実装メモ（2026-07-31）

## 目的

統治手帳（`07_科学省/taskboard/`）を国家OS・内閣の唯一の窓口にする。従来「総理」タブ（AIスマートラビットのみ）を「内閣」タブへ拡張し、13人格すべてと直接対話できるようにした。

## Phase 0 の方針（採用）

1. 「総理」タブを**「内閣」**へ改称。内部の `data-view="smartrabbit"` はそのまま維持（リスク最小化）。同一画面にメンバーピッカー（チップ）を追加。
2. 呼び出しは単一 `/api/cabinet` + `lib/cabinet-registry.cjs`。スマートラビットのみ既存 `/api/smart-rabbit`（モード・複数セッション）を維持し、他12人格は新APIへ一本化。
3. スマートラビットは各省への「申し送り」案内にとどめ、各省の主管には踏み込まない（`ai_jurisdiction.md` 準拠）。
4. 今日タブのAI尊徳は無変更。内閣タブにも尊徳を1メンバーとして追加（別セッション・別ログ）。
5. セッションはメンバー単位で1本の継続対話（`data/.cabinet-sessions.json` に agentId を保存）。ログは `chat_logs/cabinet-<member>-<date>.md`。
6. ルカ選択時は業務コンテキストを `finance` モードで注入。他メンバーも各主管に近いモードを割当て（尊徳=today、栄一/坂本龍馬/ルパン=sales寄り、ダ・ヴィンチ/アショーカ=research、北斎/正篤=instagram、テスラ=product、他=general）。
7. MVPスコープ: メンバー一覧・単一チャット・ログ・レート制限・接続状態表示。次フェーズ: 省庁ピッカーのモバイル最適化、ルカのタスク化候補、複数セッションUI（非ラビット）。

## 実装内容

- 新規: `07_科学省/taskboard/lib/cabinet-registry.cjs`（13人格のレジストリ）
- 新規: `lib/cabinet-registry.test.cjs`
- `server.cjs`: `/api/cabinet/members` `/api/cabinet/status` `/api/cabinet`(POST) を追加。既存の `checkSmartRabbitRateLimit` / `cacheSmartRabbitResult` / `enqueueByDate` を再利用してレート制限・二重送信防止。`sanitizeStateData` に `cabinetChat` / `cabinetActiveMember` を追加
- `index.html`: タブ名「総理」→「内閣」、メンバーピッカー `#cabinet-picker` を追加
- `app.js`: メンバーピッカーの取得・描画、メンバー単位チャット送受信・開幕挨拶、既存スマートラビットUIとの出し分け（モード/セッション行を非表示化）
- `styles.css`: `.cabinet-picker` / `.cabinet-chip`
- `server.test.cjs`: `/api/cabinet/*` の認証・validation・503テストを追加

## 動作確認

- `node --test` 実行。新規テストはすべて成功。既存の失敗8件は本変更以前から存在する既知の環境依存（開発機の `.env.local` に実運用の `TASKBOARD_TOKEN` が設定されているため、無トークン想定のテストが401になる）。`git stash` で変更前の状態に戻して同じ8件が失敗することを確認済み（本変更による regression ではない）。
- Playwright（headless Chromium）で実アプリを起動し、内閣タブ・13チップ表示・メンバー切替（モード/セッション行の表示切替含む）・スマートラビットへの復帰を確認。テスト中に実Cursor APIを使った開幕挨拶が2件（スマートラビット・栄一）走ったため、生成された `data/state.json` の該当エントリ・`data/.cabinet-sessions.json`・`chat_logs/cabinet-eiichi-*.md` は確認後に削除し、本番データを元の状態へ戻した。

## 変更していないもの（禁止事項の遵守）

- 旧表記・旧役職名は変更・復活させていない
- `08_情報省/ダヴィンチ図書館/`・`cabinet/chief_statecraft_minister.md` は未編集
- 戦略・ロードマップ・収益源は変更していない
