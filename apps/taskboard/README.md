# 統治手帳（タスク・予定管理 MVP）

仕様: [`strategy/taskboard_mvp_spec.md`](../../strategy/taskboard_mvp_spec.md)

---

## デスクトップPCで使う（いちばん簡単）

### 方法A — ダブルクリック（Mac）

1. Finder で `apps/taskboard/start.command` を開く  
2. 初回だけ「開いてもよいか」と聞かれたら **開く**  
3. ブラウザが自動で **http://127.0.0.1:8765/** を開く  

**ショートカット**: `start.command` をデスクトップへ **エイリアス**（⌥+ドラッグ）すると毎朝1クリック。

### 方法B — ターミナル

```bash
cd /Users/imadatadahito/Desktop/ai-imadaruma/apps/taskboard
./start.sh
```

止める: ターミナルで `Ctrl+C`

---

## AI尊徳を接続する（初回のみ）

統治手帳のチャットは Cursor SDK でローカルの尊徳エージェントを起動する。
定型応答ではなく、`cabinet/sontoku.md`、直近の尊徳ログ、今日の任務を踏まえて会話する。

1. [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) で APIキーを作る
2. `apps/taskboard/.env.local` を作り、次の1行を保存する

```bash
CURSOR_API_KEY="cursor_ここに自分のキー"
```

3. 他人が読めないよう、ターミナルで権限を設定する

```bash
chmod 600 apps/taskboard/.env.local
```

4. `start.command` または `./start.sh` で起動する

`.env.local` はGitの対象外であり、APIキーはブラウザへ送られない。
初回起動時は Cursor SDK を自動インストールする。使用モデルは既定で `auto`。

対話は日付ごとのCursorエージェントとして継続し、生ログを
`daily_governance/chat_logs/sontoku-YYYY-MM-DD.md` に自動保存する。
エージェントIDとrun IDも記録されるため、Cursor側の実行と照合できる。

---

## 別のPC／別ブラウザへ続きを移す

データは **そのブラウザの localStorage** にだけ入る。機種を変えるときは JSON で運ぶ。

| 手順 | やること |
|------|----------|
| **1. 今の端末** | 画面下 **JSON保存** → `tosei-techo-YYYY-MM-DD.json` を `data/` か iCloud に置く |
| **2. デスクトップPC** | リポジトリを同じ場所に置き、`start.command` で起動 |
| **3. 読み込み** | **JSON読込** でさっきのファイルを選ぶ |

同じ Mac・同じ Chrome なら JSON 不要（そのまま続き）。

---

## 毎日の流れ（デスクトップ）

1. `start.command` で起動  
2. **朝**: 今日タブ → AI尊徳の確認に答え、朝の意図を保存
3. **日中**: 今日／カレンダー／象限で予定を確認し、新規で追加
4. **夕**: 日タブ → ジャーナル保存  
5. **金曜**: 週タブで目標・振り返り／月タブで KPI ボード更新  
6. 週1: **JSON保存** でバックアップ（`apps/taskboard/data/` 推奨）

---

## 画面の見方

1. **全体** — 優先順位・カテゴリごとの未完了件数（タップで中身）
2. **優先順位** — コヴィの4分類（詳細マトリクス）
3. **今日** — 今日の日付・任務・朝夕の振り返り
4. **カレンダー** — 日付横のボタンから。期限・定期・メディア予定
5. **週／月** — 目標・振り返り・KPI
6. **一覧** — 全件フィルタ
7. **新規** — 追加。ポモドーロ（25分＋5分休憩）はヘッダー右の **開始** ボタン

カテゴリ名は全体タブの **名前を編集** から変更可能。

発信: 火〜金カルーセル／日NL → 配信日と2日前制作を自動挿入。

定期予定: フレスト／レックスとも、毎月1日＝請求案内、3日＝保護者案内、10日＝引き落とし日。定期タスクを完了すると期限が次回へ進む。

---

## シード

画面下 **シード読込**。一覧: `SEED_TASKS.md`

- 保存キー: `imadaruma-gyomu-tochi-v1`
- 旧キー（taskboard-v1/v2）があれば初回に引き継ぐ

---

## トラブル

| 症状 | 対処 |
|------|------|
| 画面が古い | **Cmd+Shift+R** で再読み込み |
| ポート使用中 | 既に起動済み。ブラウザで http://127.0.0.1:8765/ |
| データが空 | JSON読込、またはシード読込 |
| AI尊徳が「APIキー未設定」 | `apps/taskboard/.env.local` を作成し、統治手帳を再起動 |
| AI尊徳が「接続エラー」 | 起動中のターミナルを確認。APIキーとCursor利用権限も確認 |
| `start.command` が開けない | 右クリック → 開く。またはターミナルで `chmod +x start.command start.sh` |
