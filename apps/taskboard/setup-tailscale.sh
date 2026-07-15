#!/usr/bin/env bash
# 統治手帳を外出先からも携帯アプリのように使う（Tailscale）
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${GYOMU_TOCHI_PORT:-8765}"

TAILSCALE_BIN=""
if command -v tailscale >/dev/null 2>&1; then
  TAILSCALE_BIN="tailscale"
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  TAILSCALE_BIN="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
fi

echo "統治手帳 · Tailscale セットアップ"
echo ""

if [[ -z "$TAILSCALE_BIN" ]]; then
  echo "Tailscale が未インストールです。"
  echo ""
  echo "Mac:"
  echo "  1. App Store で「Tailscale」をインストール"
  echo "  2. または: brew install --cask tailscale"
  echo ""
  echo "iPhone:"
  echo "  App Store で「Tailscale」をインストール"
  echo ""
  echo "インストール後、このスクリプトをもう一度実行してください。"
  exit 1
fi

if ! "$TAILSCALE_BIN" status >/dev/null 2>&1; then
  echo "Tailscale にログインしてください。"
  echo "  Mac: Tailscale アプリが開きます → Log in"
  open -a Tailscale 2>/dev/null || true
  echo "  iPhone: Tailscale アプリで同じアカウントにログイン"
  exit 1
fi

IP="$("$TAILSCALE_BIN" ip -4 2>/dev/null || true)"
if [[ -z "$IP" ]]; then
  echo "Tailscale IP を取得できません。接続状態を確認してください。"
  exit 1
fi

URL="http://${IP}:${PORT}/"
LAN_URL=""
if curl --silent --fail "http://127.0.0.1:${PORT}/api/info" >/dev/null 2>&1; then
  LAN_URL="$(curl --silent "http://127.0.0.1:${PORT}/api/info" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mobileUrl',''))" 2>/dev/null || true)"
fi

echo "外出先から開くURL（どこでも使う）:"
echo "  ${URL}"
echo ""
if [[ -n "${LAN_URL}" ]]; then
  echo "家のWi-Fi内:"
  echo "  ${LAN_URL}"
  echo ""
fi

mkdir -p "$DIR/data"
cat > "$DIR/data/mobile-access.txt" <<EOF
# 統治手帳 · 携帯アクセスURL（自動生成）
# 更新: $(date '+%Y-%m-%d %H:%M')

外出先（Tailscale）: ${URL}
家のWi-Fi: ${LAN_URL:-未検出}

使い方:
1. Macで ./start.sh を起動したままにする
2. 携帯・MacBookで Tailscale を ON
3. 外出先URLをブラウザで開く
4. 共有 → ホーム画面に追加
EOF

echo "URLを保存しました: apps/taskboard/data/mobile-access.txt"
echo ""
echo "次の手順:"
echo "  1. Macで ./start.sh を起動したままにする"
echo "  2. 携帯の Tailscale を ON にする"
echo "  3. 携帯のブラウザで上のURLを開く"
echo "  4. MacBookでも同じURLをブックマーク"
echo "  5. 共有 → ホーム画面に追加（携帯）"
echo ""
echo "同じWi-Fi内なら LAN URL でも可。./start.sh 起動時に表示されます。"
