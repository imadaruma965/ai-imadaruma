#!/usr/bin/env bash
# 統治手帳を外出先からも携帯アプリのように使う（Tailscale）
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${GYOMU_TOCHI_PORT:-8765}"

echo "統治手帳 · Tailscale セットアップ"
echo ""

if ! command -v tailscale >/dev/null 2>&1; then
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

if ! tailscale status >/dev/null 2>&1; then
  echo "Tailscale にログインしてください。"
  echo "  Mac: メニューバーの Tailscale アイコン → Log in"
  echo "  iPhone: Tailscale アプリで同じアカウントにログイン"
  exit 1
fi

IP="$(tailscale ip -4 2>/dev/null || true)"
if [[ -z "$IP" ]]; then
  echo "Tailscale IP を取得できません。接続状態を確認してください。"
  exit 1
fi

URL="http://${IP}:${PORT}/"
echo "外出先から開くURL:"
echo "  ${URL}"
echo ""
echo "次の手順:"
echo "  1. Macで ./start.sh を起動したままにする"
echo "  2. 携帯の Tailscale を ON にする"
echo "  3. 携帯のブラウザで上のURLを開く"
echo "  4. 共有 → ホーム画面に追加"
echo ""
echo "同じWi-Fi内なら LAN URL でも可。./start.sh 起動時に表示されます。"
