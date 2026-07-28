#!/usr/bin/env bash
# DEPRECATED (KG-2 / 2026-07-28): 新規原本は imada-knowledge へ保存すること。
#   推奨: Vault で `aistock chatgpt "題名"` または 00_受信箱/AIインポート → aipull
#   このスクリプトは移行期間の互換用。実行ロジックは変更していない。
#   詳細: sources/chatgpt/README.md / daily_governance/chatgpt_capture.md
# ChatGPTのコピー内容を sources/chatgpt/inbox/ に時刻付きで保存する（非推奨）
set -euo pipefail
echo "警告: chatgpt_inbox_save.sh は deprecated。正本は imada-knowledge（aistock）です。" >&2

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
