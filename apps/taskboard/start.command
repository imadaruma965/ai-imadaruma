#!/usr/bin/env bash
# Finder からダブルクリックで起動（macOS）
cd "$(dirname "$0")"
chmod +x ./start.sh 2>/dev/null || true
exec ./start.sh
