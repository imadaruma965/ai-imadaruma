#!/usr/bin/env bash
# ChatGPTのコピー内容を sources/chatgpt/inbox/ に時刻付きで保存する
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INBOX="$ROOT/sources/chatgpt/inbox"
TAG="${1:-chat}"
TAG="$(echo "$TAG" | tr ' /' '--' | tr -cd 'A-Za-z0-9._-')"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT="$INBOX/${STAMP}_${TAG}.md"

if ! command -v pbpaste >/dev/null 2>&1; then
  echo "pbpaste がありません（macOS想定）" >&2
  exit 1
fi

TEXT="$(pbpaste)"
if [[ -z "${TEXT// }" ]]; then
  echo "クリップボードが空です。ChatGPTの出力を先にコピーしてください。" >&2
  exit 1
fi

mkdir -p "$INBOX"
{
  echo "# ChatGPT capture"
  echo
  echo "- saved_at: $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "- tag: $TAG"
  echo "- host: $(hostname -s 2>/dev/null || hostname)"
  echo
  echo "---"
  echo
  printf '%s\n' "$TEXT"
} >"$OUT"

echo "saved: $OUT"
echo "次: Cursorで「inboxを処理して」"
