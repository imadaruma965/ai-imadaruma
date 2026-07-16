#!/usr/bin/env bash
# 統治手帳 — ログイン時の自動起動を設定/解除する（macOS launchd）
#
# 使い方:
#   ./install-autostart.sh            自動起動を有効化
#   ./install-autostart.sh uninstall  自動起動を解除
#   ./install-autostart.sh status     状態を確認
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="com.imadaruma.taskboard"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST="$PLIST_DIR/$LABEL.plist"
DAEMON="$DIR/start-daemon.sh"
LOG_OUT="$DIR/data/autostart.log"
LOG_ERR="$DIR/data/autostart.error.log"
UID_NUM="$(id -u)"

action="${1:-install}"

uninstall() {
  if launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; then
    launchctl bootout "gui/$UID_NUM/$LABEL" 2>/dev/null || true
  fi
  launchctl unload -w "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "自動起動を解除しました。"
}

case "$action" in
  uninstall|remove|disable)
    uninstall
    exit 0
    ;;
  status)
    if launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; then
      echo "自動起動: 有効"
      launchctl print "gui/$UID_NUM/$LABEL" | grep -E "state =|pid =" || true
    else
      echo "自動起動: 無効（未設定）"
    fi
    exit 0
    ;;
  install|enable|"")
    ;;
  *)
    echo "不明なコマンド: $action"
    echo "使い方: ./install-autostart.sh [install|uninstall|status]"
    exit 1
    ;;
esac

chmod +x "$DAEMON"
mkdir -p "$PLIST_DIR" "$DIR/data"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DAEMON</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$LOG_OUT</string>
  <key>StandardErrorPath</key>
  <string>$LOG_ERR</string>
</dict>
</plist>
EOF

# 既存があれば入れ替え
launchctl bootout "gui/$UID_NUM/$LABEL" 2>/dev/null || true
launchctl unload -w "$PLIST" 2>/dev/null || true

if launchctl bootstrap "gui/$UID_NUM" "$PLIST" 2>/dev/null; then
  launchctl kickstart -k "gui/$UID_NUM/$LABEL" 2>/dev/null || true
else
  # 旧 macOS 向けフォールバック
  launchctl load -w "$PLIST"
fi

echo "自動起動を設定しました。"
echo ""
echo "  ラベル : $LABEL"
echo "  対象   : $DAEMON"
echo "  ログ   : $LOG_OUT"
echo ""
echo "これで再起動・ログインのたびに統治手帳サーバーが自動で立ち上がります。"
echo "状態確認 : ./install-autostart.sh status"
echo "解除     : ./install-autostart.sh uninstall"
