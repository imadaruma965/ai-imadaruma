#!/usr/bin/env bash
# 統治手帳 — 自動起動用（launchd から呼ばれる。ブラウザは開かない）
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"

cd "$DIR"

# node / npm を見つけられるように主要なパスを通す
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

if [[ -f "$DIR/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$DIR/.env.local"
  set +a
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Node.js が見つかりません。停止します。" >&2
  exit 1
fi

if [[ ! -d "$ROOT/node_modules/@cursor/sdk" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cursor SDK 未導入。npm install を実行します。"
  npm install --prefix "$ROOT"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 統治手帳サーバーを起動します（自動起動）"
exec node "$DIR/server.cjs"
