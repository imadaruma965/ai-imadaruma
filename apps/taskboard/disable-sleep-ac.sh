#!/usr/bin/env bash
# 統治手帳 — AC電源時のスリープ防止（外出先Tailscale用）
#
# 使い方:
#   ./disable-sleep-ac.sh
#
# 画面消灯は残し、本体スリープだけ止めます。
# 管理者パスワードのダイアログが出ます。
set -euo pipefail

osascript <<'APPLESCRIPT'
do shell script "pmset -c sleep 0 disksleep 0 standby 0 autorestart 1 womp 1 tcpkeepalive 1" with administrator privileges
APPLESCRIPT

echo "AC電源時のスリープ防止を設定しました。"
echo ""
pmset -g | grep -E "sleep|disksleep|standby|displaysleep|womp|tcpkeepalive|autorestart" || true
echo ""
echo "確認: sleep が 0 ならOK。ディスプレイ消灯（displaysleep）は残っていて問題ありません。"
echo "元に戻す例: sudo pmset -c sleep 1 disksleep 10 standby 1"
