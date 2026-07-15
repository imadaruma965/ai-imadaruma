#!/usr/bin/env bash
# 統治手帳 — デスクトップ起動
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
PORT="${GYOMU_TOCHI_PORT:-8765}"
URL="http://127.0.0.1:${PORT}/"

cd "$DIR"

if [[ -f "$DIR/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$DIR/.env.local"
  set +a
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js が見つかりません。AI尊徳の起動には Node.js が必要です。"
  exit 1
fi

if [[ ! -d "$ROOT/node_modules/@cursor/sdk" ]]; then
  echo "初回セットアップ: Cursor SDKをインストールします"
  npm install --prefix "$ROOT"
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
  if ! curl --silent --fail "${URL}api/sontoku/status" >/dev/null 2>&1; then
    echo "注意: 旧サーバーが動いています。停止してから再度 start.sh を実行してください。"
  fi
  open_browser
  exit 0
fi

echo "統治手帳を起動します（ポート ${PORT}）"
if [[ -z "${CURSOR_API_KEY:-}" ]]; then
  echo "AI尊徳: APIキー未設定（閲覧は可能、チャットは未接続）"
fi
echo "携帯: 起動後に表示されるLANアドレスを同じWi-Fiで開く"
echo "止める: このターミナルで Ctrl+C"
echo "URL: $URL"
echo ""

node "$DIR/server.cjs" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.4
open_browser
wait "$SERVER_PID"
