#!/bin/zsh
set -eu

SCRIPT_DIR=${0:A:h}
OS_DIR=${SCRIPT_DIR:h}
ROOT_DIR=${OS_DIR:h:h:h}
TEMPLATE="$SCRIPT_DIR/com.imadaruma.note-daily.plist.template"
TARGET="$HOME/Library/LaunchAgents/com.imadaruma.note-daily.plist"
NODE_BIN=$(command -v node)
RUNNER="$SCRIPT_DIR/daily-note-production.cjs"
LOG_DIR="$OS_DIR/90_実行ログ"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
sed \
  -e "s|__NODE_BIN__|$NODE_BIN|g" \
  -e "s|__RUNNER__|$RUNNER|g" \
  -e "s|__ROOT__|$ROOT_DIR|g" \
  -e "s|__LAUNCH_LOG__|$LOG_DIR/launchd.out.log|g" \
  -e "s|__LAUNCH_ERROR_LOG__|$LOG_DIR/launchd.err.log|g" \
  "$TEMPLATE" > "$TARGET"

plutil -lint "$TARGET"
launchctl bootout "gui/$(id -u)/com.imadaruma.note-daily" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$TARGET"
launchctl enable "gui/$(id -u)/com.imadaruma.note-daily"
echo "Installed: $TARGET"
echo "Schedule: research only, every day at 06:00"
