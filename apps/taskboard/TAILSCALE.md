# 統治手帳 · どこでもアクセス（Tailscale）

## 1. Macに Tailscale を入れる

インストーラーが開いているはずです。なければ:

- `/tmp/Tailscale.pkg` をダブルクリック
- または App Store で「Tailscale」を検索

## 2. ログイン（Mac）

1. メニューバーに Tailscale アイコンが出る
2. **Log in** を押す
3. Google / Apple / メール などでログイン

## 3. iPhone に Tailscale

1. App Store で「Tailscale」をインストール
2. **同じアカウント** でログイン
3. VPNを ON にする

## 4. 外出先URLを取得

ターミナルで:

```bash
cd /Users/imadatadahito/ai-imadaruma/apps/taskboard
./setup-tailscale.sh
```

表示された **外出先URL** を:

- 携帯: ホーム画面に追加
- MacBook: ブックマークに登録

URLは `data/mobile-access.txt` にも保存されます。

## 毎日の運用

1. 家のMacは **ログインしたまま・本体スリープなし**（下のスリープ防止）
2. 統治手帳は自動起動（`./install-autostart.sh`）または `./start.sh`
3. 携帯・MacBookで Tailscale ON
4. 外出先URLで統治手帳を開く

フッターが **同期済み** ならOK。

## スリープ防止（必須・外出先アクセス用）

電源を落としていなくても、**本体がスリープすると Tailscale が切れ**、外から開けなくなります。

AC電源時だけ本体スリープを止める:

```bash
cd /Users/imadatadahito/ai-imadaruma/apps/taskboard
chmod +x disable-sleep-ac.sh
./disable-sleep-ac.sh
```

- 画面消灯はそのまま（電気代・焼付き対策）
- 本体スリープだけ OFF
- 確認: `pmset -g` で `sleep 0` ならOK
