#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
x_research.py
「賢いうさぎ」X運用のための、競合・ベンチマークアカウント調査ツール（AIテスラ作）

- X API v2（Recent Search / User Timeline）を使い、投稿データをCSVへ書き出す
- 外部ライブラリ不要（Python3標準ライブラリのみ）
- 用途は社内のベンチマーク調査に限定すること（韓非子の点検条件）
  収集データを第三者へ再配布・販売しないこと。

## 事前準備

1. X Developer Portal（developer.x.com）でアプリを作成し、Bearer Tokenを取得する
   ※ X Premium（個人向けサブスク）とは別契約・別料金。従量課金プランへの登録が必要。
2. リポジトリ直下（または本スクリプトと同じ階層）に `.env` ファイルを作り、次の1行を書く。
   このファイルは絶対にコミットしない（.gitignoreに `.env` を追加すること）。

     X_BEARER_TOKEN=ここに取得したトークンを貼る

## 使い方

  # キーワード検索（直近7日以内、最大50件）
  python3 x_research.py --mode search --query "AI 自己統治 -is:retweet lang:ja" --max 50 --out output/search_result.csv

  # 特定アカウントの最近の投稿を取得
  python3 x_research.py --mode user --username fladdict --max 20 --out output/fladdict.csv

出力CSVはGoogleスプレッドシートで「ファイル→インポート→アップロード」からそのまま読み込める。
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_BASE = "https://api.twitter.com/2"


def load_env_file(env_path: Path) -> dict:
    """外部ライブラリなしで .env を読む簡易ローダー"""
    values = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def get_bearer_token() -> str:
    # 1) 環境変数を優先
    token = os.environ.get("X_BEARER_TOKEN")
    if token:
        return token
    # 2) スクリプトと同階層の .env
    local_env = load_env_file(Path(__file__).resolve().parent / ".env")
    if "X_BEARER_TOKEN" in local_env:
        return local_env["X_BEARER_TOKEN"]
    # 3) リポジトリルート想定の .env（scripts/../../../.env 付近を軽く探索）
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".env"
        if candidate.exists():
            env = load_env_file(candidate)
            if "X_BEARER_TOKEN" in env:
                return env["X_BEARER_TOKEN"]
    raise RuntimeError(
        "X_BEARER_TOKEN が見つからない。.env ファイルに X_BEARER_TOKEN=... を書くか、"
        "環境変数として export してから実行してくれ。"
    )


def api_get(path: str, params: dict, token: str) -> dict:
    url = f"{API_BASE}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"X API エラー ({e.code}): {body}") from e


def fetch_search(query: str, max_results: int, token: str) -> list:
    """Recent Search: 直近7日以内の投稿をキーワードで検索する"""
    results = []
    next_token = None
    remaining = max_results
    while remaining > 0:
        batch = min(remaining, 100)
        params = {
            "query": query,
            "max_results": max(10, batch),
            "tweet.fields": "created_at,public_metrics,author_id",
            "expansions": "author_id",
            "user.fields": "username,name",
        }
        if next_token:
            params["next_token"] = next_token
        data = api_get("/tweets/search/recent", params, token)
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
        for tweet in data.get("data", []):
            author = users.get(tweet.get("author_id"), {})
            results.append(_row(tweet, author))
        remaining -= batch
        next_token = data.get("meta", {}).get("next_token")
        if not next_token:
            break
        time.sleep(1)  # レート制限への配慮
    return results[:max_results]


def fetch_user_timeline(username: str, max_results: int, token: str) -> list:
    """特定アカウントの最近の投稿を取得する"""
    user_data = api_get(f"/users/by/username/{username}", {}, token)
    user_id = user_data.get("data", {}).get("id")
    if not user_id:
        raise RuntimeError(f"ユーザー {username} が見つからない: {user_data}")

    results = []
    next_token = None
    remaining = max_results
    author = {"username": username, "name": user_data["data"].get("name", "")}
    while remaining > 0:
        batch = min(remaining, 100)
        params = {
            "max_results": max(5, batch),
            "tweet.fields": "created_at,public_metrics",
            "exclude": "retweets,replies",
        }
        if next_token:
            params["pagination_token"] = next_token
        data = api_get(f"/users/{user_id}/tweets", params, token)
        for tweet in data.get("data", []):
            results.append(_row(tweet, author))
        remaining -= batch
        next_token = data.get("meta", {}).get("next_token")
        if not next_token:
            break
        time.sleep(1)
    return results[:max_results]


def _row(tweet: dict, author: dict) -> dict:
    metrics = tweet.get("public_metrics", {})
    tweet_id = tweet.get("id", "")
    username = author.get("username", "")
    return {
        "投稿日時": tweet.get("created_at", ""),
        "ユーザー名": f"@{username}" if username else "",
        "表示名": author.get("name", ""),
        "本文": (tweet.get("text", "") or "").replace("\n", " "),
        "いいね数": metrics.get("like_count", ""),
        "リポスト数": metrics.get("retweet_count", ""),
        "リプライ数": metrics.get("reply_count", ""),
        "投稿URL": f"https://x.com/{username}/status/{tweet_id}" if username and tweet_id else "",
    }


def write_csv(rows: list, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["投稿日時", "ユーザー名", "表示名", "本文", "いいね数", "リポスト数", "リプライ数", "投稿URL"]
    with out_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="X投稿リサーチ→CSV出力ツール")
    parser.add_argument("--mode", choices=["search", "user"], required=True, help="search=キーワード検索 / user=特定アカウント")
    parser.add_argument("--query", help="mode=search のときの検索クエリ（例: 'AI 自己統治 lang:ja -is:retweet'）")
    parser.add_argument("--username", help="mode=user のときの対象アカウント（@なし）")
    parser.add_argument("--max", type=int, default=30, help="取得件数の上限（既定30）")
    parser.add_argument("--out", default="output/x_research_result.csv", help="出力CSVのパス")
    args = parser.parse_args()

    token = get_bearer_token()

    if args.mode == "search":
        if not args.query:
            sys.exit("mode=search のときは --query が必須だ")
        rows = fetch_search(args.query, args.max, token)
    else:
        if not args.username:
            sys.exit("mode=user のときは --username が必須だ")
        rows = fetch_user_timeline(args.username, args.max, token)

    out_path = Path(args.out)
    write_csv(rows, out_path)
    print(f"{len(rows)}件を書き出した → {out_path}")


if __name__ == "__main__":
    main()
