# キングダムOS（タスク・予定管理 MVP）

仕様: [`02_経産省/strategy/taskboard_mvp_spec.md`](../../02_経産省/strategy/taskboard_mvp_spec.md)

---

## デスクトップPCで使う（いちばん簡単）

### 方法A — ダブルクリック（Mac）

1. Finder で `07_科学省/taskboard/start.command` を開く  
2. 初回だけ「開いてもよいか」と聞かれたら **開く**  
3. ブラウザが自動で **http://127.0.0.1:8765/** を開く  

**ショートカット**: `start.command` をデスクトップへ **エイリアス**（⌥+ドラッグ）すると毎朝1クリック。

### 方法B — ターミナル

```bash
cd /Users/imadatadahito/Desktop/ai-imadaruma/07_科学省/taskboard
./start.sh
```

止める: ターミナルで `Ctrl+C`

---

## AI尊徳を接続する（初回のみ）

キングダムOSのチャットは Cursor SDK でローカルの尊徳エージェントを起動する。
定型応答ではなく、`03_内務省/sontoku.md`、直近の尊徳ログ、今日の任務を踏まえて会話する。

1. [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) で APIキーを作る
2. `07_科学省/taskboard/.env.local` を作り、次の1行を保存する

```bash
CURSOR_API_KEY="cursor_ここに自分のキー"
```

3. 他人が読めないよう、ターミナルで権限を設定する

```bash
chmod 600 07_科学省/taskboard/.env.local
```

4. `start.command` または `./start.sh` で起動する

サーバー本体（`server.cjs`）も起動時に `07_科学省/taskboard/.env.local` を自動読込する（cwd やシェルの `source` に依存しない）。既存の環境変数は上書きしない。尊徳とスマートラビットは同じ判定（`hasCursorApiKey`）を使う。

`.env.local` はGitの対象外であり、APIキーはブラウザへ送られない。
初回起動時は Cursor SDK を自動インストールする。使用モデルは既定で `auto`。

対話は日付ごとのCursorエージェントとして継続し、生ログを
`03_内務省/daily_governance/chat_logs/sontoku-YYYY-MM-DD.md` に自動保存する。
エージェントIDとrun IDも記録されるため、Cursor側の実行と照合できる。

---

## 携帯アプリとして使う（PCと同期）

キングダムOSのデータ本体は **Mac上のサーバー** にあり、携帯はその画面を開く形です。  
Mac・携帯どちらで変更しても、同じデータに同期されます。

### いま（家のWi-Fi内）

携帯（LAN上の他端末）からデータを見る・保存するには、事前に **アクセストークン** の設定が必要です。
未設定のままだと、タスクデータへのアクセスは Mac本体（localhost）からしか行えません（セキュリティのため）。

1. `07_科学省/taskboard/.env.local` に長いトークンを設定する

```bash
# 例: ランダムな値を生成して貼り付ける
openssl rand -hex 32
```

```bash
TASKBOARD_TOKEN="ここに生成した値"
```

2. Macで `./start.sh` を起動
3. ターミナルに表示される **携帯（同じWi-Fi）** のURLを携帯で開く
4. iPhone: **共有 → ホーム画面に追加**

フッターが **同期済み** なら、PCと携帯は同じデータです。
（`TASKBOARD_TOKEN` はページ読み込み時にサーバーから携帯側へ自動で渡されるため、手入力は不要）

### 外出先からも使う（Tailscale）

家の外からもアプリのように使うには Tailscale を入れます。

```bash
cd 07_科学省/taskboard
chmod +x setup-tailscale.sh
./setup-tailscale.sh
```

1. Mac・iPhone 両方に [Tailscale](https://tailscale.com/) をインストール
2. **同じアカウント** でログイン
3. `./setup-tailscale.sh` で外出先URLを確認
4. 携帯でそのURLを開き、ホーム画面に追加

Macで `./start.sh` が動いている間、外出先からも更新できます。

---

## 別のPC／別ブラウザへ続きを移す（バックアップ）

データは **Macの `07_科学省/taskboard/data/state.json`** が正本。通常はJSON不要。
バックアップや別マシン移行時のみ JSON を使う。

| 手順 | やること |
|------|----------|
| **1. 今の端末** | 画面下 **JSON保存** → `tosei-techo-YYYY-MM-DD.json` を `data/` か iCloud に置く |
| **2. デスクトップPC** | リポジトリを同じ場所に置き、`start.command` で起動 |
| **3. 読み込み** | **JSON読込** でさっきのファイルを選ぶ |

同じ Mac・同じ Chrome なら JSON 不要（そのまま続き）。

---

## 毎日の流れ（デスクトップ）

1. `start.command` で起動（または自動起動）  
2. **朝**: 今日タブ → **Googleカレンダーで本日の約束**を確認 → AI尊徳・朝の意図  
3. **日中**: 任務はキングダムOS。**約束・面談は Googleカレンダーに入れる**（日時必須）  
4. **夕**: 日タブ → ジャーナル保存  
5. **金曜**: 週タブで目標・振り返り／月タブで KPI ボード更新  
6. 週1: **JSON保存** でバックアップ（`07_科学省/taskboard/data/` 推奨）

### 役割分担（予定 vs 任務）

| 正本 | 入れるもの | アラート |
|------|------------|----------|
| **キングダムOS → Googleカレンダー自動登録** | 約束・面談・移動（時刻つき） | 1日前／180分前／90分前（自動） |
| **キングダムOS（タスク）** | 任務・請求・習慣・財務・発信義務 | 今日タブ／強制任務 |

セットアップ: `07_科学省/taskboard/GOOGLE_CALENDAR.md`  
バッティング時は登録前に警告。尊徳は直近予定を見て介入する。

---

## 画面の見方

1. **全体** — 優先順位・カテゴリごとの未完了件数（タップで中身）
2. **優先順位** — コヴィの4分類（詳細マトリクス）
3. **今日** — 今日の日付・任務・朝夕の振り返り。約束はヘッダー／バナーから Googleカレンダーへ
4. **カレンダー** — タスク期限・定期・メディア。時刻つき約束は Googleカレンダー
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
| AI尊徳が「APIキー未設定」 | `07_科学省/taskboard/.env.local` を作成し、キングダムOSを再起動 |
| AI尊徳が「接続エラー」 | 起動中のターミナルを確認。APIキーとCursor利用権限も確認 |
| 携帯で開けない | Macと携帯が同じWi-Fiか確認。`./start.sh` 起動時のLAN URLを使う |
| 携帯で開けるが「認証トークンが正しくありません」 | `07_科学省/taskboard/.env.local` に `TASKBOARD_TOKEN` を設定してキングダムOSを再起動（LANアクセスには必須） |
| 外出先で開けない | `./setup-tailscale.sh` で Tailscale を設定 |
| 同期されない | フッターの同期状態を確認。Macで `./start.sh` が動いているか確認 |
| `start.command` が開けない | 右クリック → 開く。またはターミナルで `chmod +x start.command start.sh` |
