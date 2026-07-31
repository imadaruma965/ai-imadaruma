# Google Sheets 追記（OAuth・アカウントリサーチ）

キングダムOS の Google OAuth を **Calendar + Sheets** 共通にし、リサーチCSVをスプレッドシートへ自動追記できます。

対象シート例: [バズリール／アカウントリサーチ](https://docs.google.com/spreadsheets/d/1NzKgrJhHu_G2kQ7dXOnI9z434c3CbOhLu3j9IcFDkNo/edit)

---

## 1回だけのセットアップ（推奨: サービスアカウント）

### 1. Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを開く
2. **APIとサービス → ライブラリ** で **Google Sheets API** を有効化
3. **認証情報 → サービスアカウントを作成** → キー（JSON）を作成してダウンロード

### 2. JSON の配置

```text
07_科学省/taskboard/secrets/google-sheets-service-account.json
```

（`07_科学省/taskboard/secrets/` は Git 対象外）

### 3. シート共有

対象スプレッドシートを、JSON 内の `client_email` と **編集者** で共有する。

### 代替: OAuth（個人アカウント）

Calendar 連携と同じ OAuth でも可。`.env.local` に `GOOGLE_CLIENT_ID` / `SECRET` を入れ、`node 07_科学省/taskboard/scripts/google-oauth-login.cjs` で認可。詳細は旧手順のまま `GOOGLE_CALENDAR.md` も参照。

---

## 追記コマンド

```bash
# 重複チェックのみ
node 07_科学省/taskboard/scripts/sheets-append-account-research.cjs --dry-run

# 本番追記（アカウントリサーチタブ、既存ハンドルはスキップ）
node 07_科学省/taskboard/scripts/sheets-append-account-research.cjs

# CSV指定
node 07_科学省/taskboard/scripts/sheets-append-account-research.cjs \
  --csv 08_情報省/ダヴィンチ図書館/90_国家OS保管/domain_ministries/communications/drafts/instagram_account_research_30_2026-07-29.csv
```

既定CSV: `08_情報省/ダヴィンチ図書館/90_国家OS保管/domain_ministries/communications/drafts/instagram_account_research_30_2026-07-29.csv`

---

## 注意

- シートは **編集権限のある Google アカウント** で認可すること（閲覧のみだと 403）
- スコープ変更後は必ず **再認可**（`prompt=consent`）
- 秘密値・トークンをチャットやコミットに載せない
