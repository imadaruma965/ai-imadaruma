# 統治手帳 × Googleカレンダー連携

予定を統治手帳に入れると **自動で Googleカレンダーへ登録**し、

- **バッティング検知**（被っていたら確認）
- **通知の自動設定**（既定: 1日前／180分前／90分前）
- **AI尊徳への予定共有**（直近予定を会話コンテキストに渡す）

を行います。

---

## 1回だけのセットアップ（Google Cloud）

### 1. プロジェクトと API

1. [Google Cloud Console](https://console.cloud.google.com/) を開く  
2. プロジェクトを作成（または選択）  
3. **APIとサービス → ライブラリ** で **Google Calendar API** を有効化  

### 2. OAuth クライアント

1. **APIとサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID**  
2. 同意画面（外部／テスト）を済ませる。テストなら自分の Google アカウントをテストユーザーに追加  
3. アプリケーションの種類: **ウェブアプリケーション**  
4. 承認済みのリダイレクト URI に次を追加:

```text
http://127.0.0.1:8765/api/gcal/callback
```

（ポートを変えている場合は合わせる）

5. 発行された **クライアント ID** と **クライアント シークレット** を控える  

### 3. `.env.local` に書く

`apps/taskboard/.env.local`（既存の CURSOR_API_KEY の下など）:

```bash
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxx"
GOOGLE_REDIRECT_URI="http://127.0.0.1:8765/api/gcal/callback"
# 任意。未指定なら primary
# GOOGLE_CALENDAR_ID="primary"
# 通知（分前）。カンマ区切り
GCAL_REMINDERS_MINUTES="1440,180,90"
```

### 4. 再起動して接続

```bash
# launchd 利用中なら
cd apps/taskboard && ./install-autostart.sh
# または ./start.sh
```

統治手帳 → **今日** → **Googleに接続** → ブラウザで許可。

トークンは `apps/taskboard/data/gcal-token.json` に保存（Git対象外）。

---

## 使い方

1. 今日タブの「予定・約束」に **内容・日・開始・終了** を入れる（🎤可）  
2. **Googleに登録**  
3. 被っていたら警告 → やめる／それでも登録  
4. Googleカレンダー側に予定＋ポップアップ通知が入る  
5. 尊徳チャットを開くと、直近予定を踏まえて応答する  

---

## 注意

- 初回接続は **家のMacのブラウザで `127.0.0.1`** から行う（リダイレクト URI のため）  
- 携帯の Tailscale URL からは OAuth コールバックが合わないことがある → 接続作業はデスクトップで  
- 接続後の予定登録は、携帯からでも API 経由で可能  
- Google側の通知は、端末のカレンダー／Googleアプリ通知設定が ON である必要あり  
