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

1. Macで `./start.sh` を起動（または常時起動）
2. 携帯・MacBookで Tailscale ON
3. 外出先URLで統治手帳を開く

フッターが **同期済み** ならOK。
