#!/usr/bin/env python3
"""学習ループ：前回から増えた会話だけを抜き出す（決定的処理・モデルを使わない）。

使い方:
  python3 05_情報省/学習ループ/extract_new_turns.py            # 抽出（_work/ に書き出す）
  python3 05_情報省/学習ループ/extract_new_turns.py --budget 60000
  python3 05_情報省/学習ループ/extract_new_turns.py commit     # 抽出を処理済みとして記録する

抽出だけでは state.json を更新しない。エージェントが読み終えて commit したときに初めて進む。
途中で失敗しても、同じ範囲を次回もう一度読むだけで、会話を取りこぼさない。
"""
import json
import pathlib
import shutil
import sys
from datetime import datetime

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[1]
PROJECT_JSONL = pathlib.Path.home() / ".claude/projects/-Users-imadatadahito-Desktop-ai-imadaruma"
VAULT_AI = REPO / "05_情報省/ダヴィンチ図書館/05_AI対話"
VAULT_SOURCES = ["ChatGPT", "Gemini", "Codex", "Cursor"]  # Claude は jsonl から読むので除外
STATE = HERE / "state.json"
WORK = HERE / "_work"
PENDING = WORK / "pending_state.json"
MANIFEST = WORK / "manifest.json"
MARKER = "【学習ループ】"  # 学習ループ自身の実行セッションは学習対象にしない
TURN_MAX = 4000
DEFAULT_BUDGET = 180000


def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"jsonl": {}, "vault": {}, "last_commit": None}


def turn_text(content):
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list):
        return ""
    parts = []
    for b in content:
        if isinstance(b, dict) and b.get("type") == "text" and isinstance(b.get("text"), str):
            parts.append(b["text"])
    return "\n".join(parts).strip()


def is_noise(role, text):
    if not text:
        return True
    if role == "user" and (text.startswith("<") or text.startswith("Base directory for this skill")
                           or text.startswith("Skill /") or text.startswith("Tool loaded")):
        return True
    return False


def prepare(budget):
    state = load_state()
    new_state = json.loads(json.dumps(state))
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(parents=True)
    used = 0
    chunks = []

    files = sorted(PROJECT_JSONL.glob("*.jsonl"), key=lambda p: p.stat().st_mtime)
    for f in files:
        if used >= budget:
            break
        lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
        start = state["jsonl"].get(f.name, 0)
        if len(lines) <= start:
            continue
        if MARKER in "\n".join(lines[:40]):
            new_state["jsonl"][f.name] = len(lines)
            continue
        out, t_first, t_last, stop = [], None, None, len(lines)
        for i in range(start, len(lines)):
            if used >= budget:
                stop = i
                break
            try:
                o = json.loads(lines[i])
            except json.JSONDecodeError:
                continue
            m = o.get("message") or {}
            role = m.get("role")
            if role not in ("user", "assistant"):
                continue
            text = turn_text(m.get("content"))
            if is_noise(role, text):
                continue
            if len(text) > TURN_MAX:
                text = text[:TURN_MAX] + "\n…（以下省略）"
            ts = (o.get("timestamp") or "")[:16]
            t_first = t_first or ts
            t_last = ts
            label = "BOSS" if role == "user" else "AI"
            block = f"### [{ts}] {label}\n{text}\n"
            out.append(block)
            used += len(block)
        new_state["jsonl"][f.name] = stop
        if out:
            name = f"{f.stem[:8]}_{start}-{stop}.md"
            header = (f"# 会話 {f.stem}\n- 行: {start}〜{stop}（全{len(lines)}行）\n"
                      f"- 期間(UTC): {t_first} 〜 {t_last}\n\n")
            (WORK / name).write_text(header + "\n".join(out), encoding="utf-8")
            chunks.append({"file": str((WORK / name).relative_to(REPO)), "session": f.stem,
                           "from": t_first, "to": t_last, "partial": stop < len(lines)})

    vault_files = []
    for src in VAULT_SOURCES:
        base = VAULT_AI / src
        if not base.exists():
            continue
        for p in sorted(base.rglob("*.md")):
            rel = str(p.relative_to(REPO))
            mtime = p.stat().st_mtime
            if state["vault"].get(rel, 0) >= mtime:
                continue
            if used >= budget:
                break
            size = p.stat().st_size // 3
            vault_files.append({"file": rel, "source": src})
            new_state["vault"][rel] = mtime
            used += size

    PENDING.write_text(json.dumps(new_state, ensure_ascii=False, indent=1), encoding="utf-8")
    remaining = any(c["partial"] for c in chunks) or used >= budget
    manifest = {
        "status": "nothing_new" if not chunks and not vault_files else "ok",
        "chunks": chunks,
        "vault_files": vault_files,
        "chars": used,
        "more_remaining": remaining,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=1))


def commit():
    if not PENDING.exists():
        print("pending_state.json がありません。先に抽出を実行してください。")
        sys.exit(1)
    st = json.loads(PENDING.read_text(encoding="utf-8"))
    st["last_commit"] = datetime.now().isoformat(timespec="seconds")
    STATE.write_text(json.dumps(st, ensure_ascii=False, indent=1), encoding="utf-8")
    shutil.rmtree(WORK)
    print(f"処理済みとして記録しました（{st['last_commit']}）")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "commit":
        commit()
    else:
        budget = DEFAULT_BUDGET
        if "--budget" in args:
            budget = int(args[args.index("--budget") + 1])
        prepare(budget)
