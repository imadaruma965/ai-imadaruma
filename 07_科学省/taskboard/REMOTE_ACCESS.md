# デスクトップPCを外から扱う（推奨セット）

> **対象機**: この iMac（Tailscale名 `imac` / IP `100.92.246.105`）  
> **更新**: 2026-08-04  
> **原則**: Tailscale の中だけで繋ぐ。ルーターのポート開放はしない。

---

## いま有効な土台（確認済み）

| 項目 | 状態 |
|------|------|
| Tailscale | ON（`imac` = `100.92.246.105`） |
| ACスリープ | `sleep 0`（本体は眠らない） |
| 統治手帳 | `:8765` で LISTEN 中 |
| note MacBook (`macbook-pro-2`) | 2026-08-04 画面共有（VNC）疎通確認OK |

外出先URL（統治手帳）: `http://100.92.246.105:8765/`  
（再生成: `07_科学省/taskboard/./setup-tailscale.sh`）

---

## 推奨セット（全部やる）

### A. Tailscale（土台・必須）

**このデスクトップ**
1. メニューバーの Tailscale が Connected
2. note / iPhone も **同じアカウント** で Connected

**note から疎通確認**
```bash
ping -c 3 100.92.246.105
```

CLI が壊れている場合（`Failed to load preferences`）:
```bash
# アプリ同梱の正しいバイナリを使う（大文字 Tailscale）
/Applications/Tailscale.app/Contents/MacOS/Tailscale status
```
`/usr/local/bin/tailscale` は小文字 `tailscale` を呼んで失敗することがある。`~/bin/tailscale` ラッパーを推奨。

---

### B. 画面共有（デスクトップまるごと操作）

**このデスクトップで一度だけ**
1. システム設定 → 一般 → **共有**
2. **画面共有** をオン
3. 許可するユーザーに自分のアカウント

**note から**
- Finder →移動 →サーバへ接続 → `vnc://100.92.246.105`
- または「画面共有.app」で IP を指定

これで外から iMac の画面を操作できる。

---

### C. リモートログイン / SSH（ターミナル・Cursor）

**このデスクトップで一度だけ**
1. 共有 → **リモートログイン** をオン

**note から**
```bash
ssh imadatadahito@100.92.246.105
```

Cursor: Remote SSH で `imadatadahito@100.92.246.105` をホストに追加。

---

### D. 統治手帳だけ（ブラウザ）

note / iPhone で Tailscale ON →  
`http://100.92.246.105:8765/`

---

### E. リポジトリ同期（ファイル）

コードはこれまでどおり GitHub:
```bash
cd ~/player-growth-system && git pull
cd ~/imada-knowledge && git pull
cd ~/ai-imadaruma && git pull
```

---

## 外出前チェック（30秒）

1. [ ] iMac 電源ON・ログイン済み
2. [ ] Tailscale Connected（iMac）
3. [ ] 画面共有 ON（画面操作するなら）
4. [ ] リモートログイン ON（SSHするなら）
5. [ ] 統治手帳プロセス生存（`:8765`）
6. [ ] note / 携帯で Tailscale ON

---

## トラブル

| 症状 | 見ること |
|------|----------|
| ping 不通 | 両方の Tailscale / note が offline でないか |
| VNC 拒否 | 画面共有がオフ／ユーザ未許可 |
| SSH 拒否 | リモートログインがオフ |
| 手帳が古い | サーバ再起動（launchd kickstart）＋ブラウザ更新 |
| 途中で切れる | `pmset -g` で `sleep` が 0 か。戻っていたら `./disable-sleep-ac.sh` |
