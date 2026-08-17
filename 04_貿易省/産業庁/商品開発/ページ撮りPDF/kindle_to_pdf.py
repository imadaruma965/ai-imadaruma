#!/usr/bin/env python3
"""Capture a Kindle for Mac book one page at a time and combine it as a PDF."""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import pyautogui
from PIL import Image, ImageChops, ImageStat


APP_NAMES = ("Kindle", "Amazon Kindle")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Kindle for Mac のページを右矢印で送り、画面をPDF化します。"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(f"kindle_{datetime.now():%Y%m%d_%H%M%S}.pdf"),
        help="出力PDFのパス",
    )
    parser.add_argument("--start-delay", type=float, default=5.0, help="開始前の待機秒数")
    parser.add_argument("--page-delay", type=float, default=1.2, help="ページ送り後の最低待機秒数")
    parser.add_argument(
        "--change-timeout", type=float, default=8.0, help="画面変化を待つ最大秒数"
    )
    parser.add_argument(
        "--same-checks",
        type=int,
        default=3,
        help="最終ページと判定する連続無変化回数",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.8,
        help="同一画面とみなす平均画素差 (0〜255)",
    )
    parser.add_argument("--max-pages", type=int, default=5000, help="安全のための最大ページ数")
    parser.add_argument(
        "--page-key",
        choices=("left", "right"),
        default="right",
        help="ページを進める矢印キー。縦書き・右開きの本はleft",
    )
    parser.add_argument(
        "--keep-images",
        action="store_true",
        help="PDF作成後もページ画像を保持（異常終了時は常に保持）",
    )
    parser.add_argument(
        "--skip-focus-click",
        action="store_true",
        help="開始時の本文中央クリックを省略（ページフリップ誤作動時に使用）",
    )
    return parser.parse_args()


def run_applescript(script: str) -> str:
    result = subprocess.run(
        ["osascript", "-e", script], capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or "AppleScriptの実行に失敗しました"
        raise RuntimeError(detail)
    return result.stdout.strip()


def find_kindle_window() -> tuple[str, tuple[int, int, int, int]]:
    for app_name in APP_NAMES:
        escaped = app_name.replace('"', '\\"')
        script = f'''
tell application "System Events"
    if exists process "{escaped}" then
        tell process "{escaped}"
            if (count of windows) is 0 then return "NO_WINDOW"
            set frontmost to true
            set p to position of front window
            set s to size of front window
            return (item 1 of p as text) & "," & (item 2 of p as text) & "," & ¬
                (item 1 of s as text) & "," & (item 2 of s as text)
        end tell
    end if
end tell
return "NOT_FOUND"
'''
        raw = run_applescript(script)
        if raw not in {"NOT_FOUND", "NO_WINDOW"}:
            values = tuple(int(part.strip()) for part in raw.split(","))
            if len(values) != 4 or values[2] <= 0 or values[3] <= 0:
                raise RuntimeError(f"Kindleウィンドウの座標が不正です: {raw}")
            return app_name, values  # type: ignore[return-value]
    raise RuntimeError("Kindleアプリのウィンドウが見つかりません。")


def activate(app_name: str) -> None:
    escaped = app_name.replace('"', '\\"')
    # Kindleの新しいmacOS版では、System Events上のプロセス名は
    # "Kindle"でも `tell application "Kindle" to activate` が
    # -1728で失敗することがある。検出済みプロセスを直接前面にする。
    run_applescript(
        f'''tell application "System Events"
    tell process "{escaped}" to set frontmost to true
end tell'''
    )


def screenshot(region: tuple[int, int, int, int]) -> Image.Image:
    return pyautogui.screenshot(region=region).convert("RGB")


def difference(a: Image.Image, b: Image.Image) -> float:
    """Return a cheap mean pixel difference after downscaling."""
    size = (240, max(1, round(240 * a.height / a.width)))
    a_small = a.resize(size).convert("L")
    b_small = b.resize(size).convert("L")
    return float(ImageStat.Stat(ImageChops.difference(a_small, b_small)).mean[0])


def wait_for_page(
    previous: Image.Image,
    region: tuple[int, int, int, int],
    minimum_delay: float,
    timeout: float,
    threshold: float,
) -> tuple[Image.Image, bool]:
    time.sleep(minimum_delay)
    deadline = time.monotonic() + timeout
    candidate = screenshot(region)
    while time.monotonic() < deadline:
        if difference(previous, candidate) > threshold:
            # ページめくりアニメーションや遅延描画が落ち着くのを待つ。
            time.sleep(0.35)
            settled = screenshot(region)
            if difference(candidate, settled) <= threshold:
                return settled, True
            candidate = settled
        else:
            time.sleep(0.25)
            candidate = screenshot(region)
    return candidate, difference(previous, candidate) > threshold


def make_pdf(image_paths: list[Path], output: Path) -> None:
    if not image_paths:
        raise RuntimeError("PDFにする画像がありません。")
    output.parent.mkdir(parents=True, exist_ok=True)
    images = [Image.open(path).convert("RGB") for path in image_paths]
    try:
        images[0].save(output, "PDF", save_all=True, append_images=images[1:], resolution=144.0)
    finally:
        for image in images:
            image.close()


def main() -> int:
    args = parse_args()
    if (
        args.same_checks < 1
        or args.max_pages < 1
        or args.threshold < 0
        or args.start_delay < 0
        or args.page_delay < 0
        or args.change_timeout < 0
    ):
        raise ValueError("各オプションには0以上（回数・ページ数は1以上）を指定してください。")

    output = args.output.expanduser().resolve()
    image_dir = output.with_suffix("").with_name(output.stem + "_pages")
    image_dir.mkdir(parents=True, exist_ok=True)

    app_name, region = find_kindle_window()
    print(f"Kindleウィンドウ: x={region[0]}, y={region[1]}, 幅={region[2]}, 高さ={region[3]}")
    print(f"{args.start_delay:g}秒後に開始します。停止するにはマウスを画面左上へ移動してください。")
    activate(app_name)
    # Kindleを前面にしただけでは、キー入力のフォーカスが本文へ移らない
    # バージョンがある。本文中央をクリックしてから撮影を開始する。
    if not args.skip_focus_click:
        pyautogui.click(region[0] + region[2] // 2, region[1] + region[3] // 2)
    time.sleep(args.start_delay)

    paths: list[Path] = []
    current = screenshot(region)
    interrupted = False
    try:
        for page_number in range(1, args.max_pages + 1):
            page_path = image_dir / f"page_{page_number:05d}.png"
            current.save(page_path, "PNG")
            paths.append(page_path)
            print(f"撮影: {page_number}ページ", flush=True)

            for unchanged in range(1, args.same_checks + 1):
                pyautogui.press(args.page_key)
                candidate, changed = wait_for_page(
                    current, region, args.page_delay, args.change_timeout, args.threshold
                )
                if changed:
                    current = candidate
                    break
                print(f"画面変化なし ({unchanged}/{args.same_checks})", flush=True)
            else:
                break
        else:
            print(f"警告: 最大ページ数 {args.max_pages} に到達しました。", file=sys.stderr)
    except pyautogui.FailSafeException:
        interrupted = True
        print("緊急停止を検出しました。撮影済みページからPDFを作成します。", file=sys.stderr)
    except KeyboardInterrupt:
        interrupted = True
        print("中断を検出しました。撮影済みページからPDFを作成します。", file=sys.stderr)

    make_pdf(paths, output)
    print(f"PDFを作成しました: {output} ({len(paths)}ページ)")

    if not args.keep_images and not interrupted:
        for path in paths:
            path.unlink()
        try:
            image_dir.rmdir()
        except OSError:
            pass
    else:
        print(f"ページ画像: {image_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError) as exc:
        print(f"エラー: {exc}", file=sys.stderr)
        raise SystemExit(1)
