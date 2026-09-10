# Codex 発注: Xアカウント分析／投稿分析 → Google Sheets

このリポジトリで、X（旧Twitter）の**公式 API v2 だけ**を使い、アカウント分析と投稿分析を Google スプレッドシートへ書き込む CLI を新規作成せよ。

## 絶対禁止

- x.com / twitter.com の HTML スクレイピング
- 非公式 GraphQL、ゲストトークン、Cookie 流用、Puppeteer/Playwright ログイン
- レート制限回避、認証バイパス、非公開アカウントの取得
- 既存の大量未コミットファイル（任務盤・各省 md）を編集しない
- 秘密情報（.env、credentials、auth.json）をコミット対象にしない

国家正本でも「スクレイピングで無断取得はするな」（`00_律令府/戦略/装置仕様/指標の取り方メモ.md`）。BOSS 依頼の「スクレイピング」は、**正規 API による収集＋Sheets 書き込み**として実装する。README の冒頭にその旨を1段落書け。

## 置き場所（新規ディレクトリのみ）

`03_貿易省/産業庁/商品開発/Xアカウント分析/`

参考にしてよい既存実装（読取のみ）:

- Sheets 書き込み: `03_貿易省/産業庁/商品開発/note伸び記事レーダー/lib/sheets.cjs` と `note-radar.cjs`
- Google 認証: `03_貿易省/産業庁/任務盤/GOOGLE_SHEETS.md`、`gsheets.cjs`、`lib/load-local-env.cjs`
- アカウントリサーチ追記: `03_貿易省/産業庁/任務盤/scripts/sheets-append-account-research.cjs`
- HTTP 待機: `03_貿易省/産業庁/商品開発/note伸び記事レーダー/lib/http.cjs`（X API は公式エンドポイントのみ）

可能なら noteレーダーの Sheets 認証を再利用（コピーして局所化してよい）。任務盤本体は触るな。

## 機能

CLI（Node.js、追加の重いフレームワーク禁止）:

```bash
node 03_貿易省/産業庁/商品開発/Xアカウント分析/x-radar.cjs --users fladdict,kensuu,hitodeblog --dry-run
node 03_貿易省/産業庁/商品開発/Xアカウント分析/x-radar.cjs --users fladdict,kensuu
```

1. 引数のユーザー名（カンマ区切り or 繰り返し `--users`）を正規化（先頭 `@` 除去）
2. X API v2:
   - `GET /2/users/by?usernames=` でアカウント（`public_metrics`, `description`, `created_at`, `verified`, `url`）
   - 各ユーザー `GET /2/users/:id/tweets` で直近投稿（既定 20、`--tweets 5..50`）
   - tweet `public_metrics`, `created_at`, `text`, `lang`。リプライ除外は `--exclude replies` 任意
3. Google Sheets へ2タブ:
   - `Xアカウント`: 観測日時, username, name, bio, followers, following, tweet_count, listed_count, created_at, verified, profile_url
   - `X投稿`: 観測日時, username, tweet_id, created_at, text, likes, retweets, replies, quotes, impressions(取れれば), tweet_url
4. `--dry-run` なら Sheets に書かず JSON 要約を stdout
5. 失敗したユーザーは落とさず、エラー列または stderr に残して続行
6. 429 が来たら Retry-After または 60 秒待って1回だけリトライ。それ以上は失敗として記録

## 認証

- X: 環境変数 `X_BEARER_TOKEN`（`.env.local` から読込可。任務盤の `load-local-env` をコピーして局所化）
- Google: 既存どおり。サービスアカウント JSON `03_貿易省/産業庁/任務盤/secrets/google-sheets-service-account.json` または OAuth。スプレッドシート ID は `--spreadsheet-id` または `GOOGLE_SHEETS_SPREADSHEET_ID`。未指定時は新規作成して URL を表示（noteレーダーの create スクリプトに倣う）か、README に「初回は ID 必須」と明記して exit 1
- `.env.local.example` を置く（実トークンは置かない）
- ディレクトリを `.gitignore` に入れるな。`.env.local` と secrets は既存 gitignore に任せる。足りなければルート `.gitignore` に `**/.env.local` があるか確認し、無ければ1行足すだけ

## README

日本語で1画面:

- 何をするか（公式 API。スクレイピングではない）
- X Developer で Bearer Token を取る手順のリンク（developers.x.com）
- 環境変数
- dry-run と本番コマンド
- タブ列
- 有料 API プランが無いと user/tweets が 403 になる可能性を明記

## 完了条件

- 上記ディレクトリに動く CLI と README がある
- 公式 API 以外の取得経路がコードに無い
- 任務盤・他省の既存ファイルを変更していない（gitignore の1行追加は可）
- 秘密ファイルを作っていない

終わったら作成ファイル一覧と、手元で動かす最短コマンドを最終メッセージに書け。
