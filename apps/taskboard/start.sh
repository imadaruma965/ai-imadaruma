#!/usr/bin/env bash
# 業務統治 — デスクトップ起動
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${GYOMU_TOCHI_PORT:-8765}"
URL="http://127.0.0.1:${PORT}/"

cd "$DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 が見つかりません。macOS なら Xcode Command Line Tools を入れてください。"
  exit 1
fi

is_listening() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  else
    echo "ブラウザで開いてください: $URL"
  fi
}

if is_listening; then
  echo "既に起動中です → $URL"
  open_browser
  exit 0
fi

echo "業務統治を起動します（ポート ${PORT}）"
echo "止める: このターミナルで Ctrl+C"
echo "URL: $URL"
echo ""

python3 -m http.server "$PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.4
open_browser
wait "$SERVER_PID"
