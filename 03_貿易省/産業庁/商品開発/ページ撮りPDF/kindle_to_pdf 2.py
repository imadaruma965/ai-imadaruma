#!/usr/bin/env python3
"""Capture a Kindle for Mac book one page at a time and combine it as a PDF."""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from collections import deque
from datetime import datetime
from pathlib import Path

import pyautogui
from PIL import Image, ImageChops, ImageStat


APP_NAMES = ("Kindle", "Amazon Kindle")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Kindle for Mac のページを送り、画面をPDF化します。"
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
        "--min-pages",
        type=int,
        default=5,
        help="これ未満なら失敗（表紙だけで止まった誤成功を防ぐ）",
    )
    parser.add_argument(
        "--page-key",
        choices=("left", "right", "auto"),
        default="auto",
        help="ページを進める方向。autoなら開始前に両方向へ試し送りして自動判定する（既定）",
    )
    parser.add_argument(
        "--keep-images",
        action="store_true",
        help="PDF作成後もページ画像を保持（異常終了時は常に保持）",
    )
    parser.add_argument(
        "--skip-focus-click",
        action="store_true",
        help="開始時の本文クリックを省略（ページフリップ誤作動時に使用）",
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
            time.sleep(0.35)
            settled = screenshot(region)
            if difference(candidate, settled) <= threshold:
                return settled, True
            candidate = settled
        else:
            time.sleep(0.25)
            candidate = screenshot(region)
    return candidate, difference(previous, candidate) > threshold


def other_key(page_key: str) -> str:
    return "left" if page_key == "right" else "right"


def park_mouse(region: tuple[int, int, int, int]) -> None:
    """Kindleが画面左端だと、カーソルが(0,0)の緊急停止に触れやすい。"""
    pyautogui.moveTo(
        region[0] + max(80, region[2] // 2),
        region[1] + int(region[3] * 0.6),
        duration=0.15,
    )


def focus_reader(region: tuple[int, int, int, int]) -> None:
    """中央クリックはページフリップが開くことがあるので、やや下を押す。"""
    pyautogui.click(
        region[0] + region[2] // 2,
        region[1] + int(region[3] * 0.62),
    )
    time.sleep(0.25)


def edge_click_point(region: tuple[int, int, int, int], page_key: str) -> tuple[int, int]:
    x_ratio = 0.88 if page_key == "right" else 0.12
    return (
        region[0] + int(region[2] * x_ratio),
        region[1] + int(region[3] * 0.58),
    )


def send_turn(
    page_key: str,
    region: tuple[int, int, int, int],
    *,
    use_click: bool,
    app_name: str,
) -> None:
    activate(app_name)
    time.sleep(0.05)
    if use_click:
        pyautogui.click(*edge_click_point(region, page_key))
    else:
        pyautogui.press(page_key)


def turn_until_changed(
    previous: Image.Image,
    region: tuple[int, int, int, int],
    page_key: str,
    minimum_delay: float,
    timeout: float,
    threshold: float,
    app_name: str,
) -> tuple[Image.Image, bool, str]:
    """キーで送り、動かなければ同じ方向の画面端クリックを1回試す。"""
    send_turn(page_key, region, use_click=False, app_name=app_name)
    image, changed = wait_for_page(previous, region, minimum_delay, timeout, threshold)
    if changed:
        return image, True, "key"
    send_turn(page_key, region, use_click=True, app_name=app_name)
    image, changed = wait_for_page(previous, region, minimum_delay, timeout, threshold)
    if changed:
        return image, True, "click"
    return image, False, "none"


def fingerprint(image: Image.Image) -> bytes:
    """近いページの再訪（表紙への往復など）を検出する。"""
    return image.resize((48, 48)).convert("L").tobytes()


def detect_page_direction(
    first_page: Image.Image,
    region: tuple[int, int, int, int],
    minimum_delay: float,
    timeout: float,
    threshold: float,
    app_name: str,
) -> tuple[str, Image.Image, bool]:
    """開始ページに対して左右へ試し送りし、実際に画面が動いた方向を採用する。

    縦書き表紙では right キーが無効で left だけ進むことがある。
    キーが届かない場合は同じ方向の画面端クリックを試す。
    """
    probe_timeout = min(2.0, timeout)
    # 縦書きは left が進む。表紙では right が無反応なことが多いので left を先に試す。
    # 横書き本文の途中開始だと left は戻るため、2回連続で進んだ方向だけ採用する。
    for candidate_key in ("left", "right"):
        result, changed, method = turn_until_changed(
            first_page,
            region,
            candidate_key,
            minimum_delay,
            probe_timeout,
            threshold,
            app_name,
        )
        if changed:
            print(
                f"綴じ方向を自動判定: {candidate_key}（{method}）でページが進みました。",
                flush=True,
            )
            return candidate_key, result, True

    print(
        "警告: 開始ページで方向判定ができませんでした。right固定で撮影を続けます。",
        file=sys.stderr,
    )
    return "right", first_page, False


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
        or args.min_pages < 1
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
    park_mouse(region)
    if not args.skip_focus_click:
        focus_reader(region)
        park_mouse(region)
    time.sleep(args.start_delay)
    activate(app_name)
    park_mouse(region)

    paths: list[Path] = []
    recent: deque[bytes] = deque(maxlen=16)
    first_page = screenshot(region)
    page_key = args.page_key
    interrupted = False
    try:
        if page_key == "auto":
            page_key, moved_image, moved = detect_page_direction(
                first_page,
                region,
                args.page_delay,
                args.change_timeout,
                args.threshold,
                app_name,
            )
        else:
            moved_image, moved = first_page, False

        first_path = image_dir / "page_00001.png"
        first_page.save(first_path, "PNG")
        paths.append(first_path)
        recent.append(fingerprint(first_page))
        print("撮影: 1ページ", flush=True)

        if moved:
            current = moved_image
            start_page_number = 2
        else:
            current = first_page
            start_page_number = 1

        for page_number in range(start_page_number, args.max_pages + 1):
            if page_number > 1:
                fp = fingerprint(current)
                if fp in recent:
                    print(
                        "同じページへ戻りました。送り方向を反転して続行します。",
                        flush=True,
                    )
                    page_key = other_key(page_key)
                    candidate, changed, method = turn_until_changed(
                        current,
                        region,
                        page_key,
                        args.page_delay,
                        args.change_timeout,
                        args.threshold,
                        app_name,
                    )
                    if not changed:
                        break
                    current = candidate
                    continue
                page_path = image_dir / f"page_{page_number:05d}.png"
                current.save(page_path, "PNG")
                paths.append(page_path)
                recent.append(fp)
                print(f"撮影: {page_number}ページ", flush=True)

            progressed = False
            for unchanged in range(1, args.same_checks + 1):
                send_turn(page_key, region, use_click=False, app_name=app_name)
                candidate, changed = wait_for_page(
                    current, region, args.page_delay, args.change_timeout, args.threshold
                )
                if changed:
                    current = candidate
                    progressed = True
                    break
                print(f"画面変化なし ({unchanged}/{args.same_checks})", flush=True)
            if progressed:
                continue

            fallback_key = other_key(page_key)
            send_turn(fallback_key, region, use_click=False, app_name=app_name)
            candidate, changed = wait_for_page(
                current, region, args.page_delay, args.change_timeout, args.threshold
            )
            if changed:
                print(
                    f"逆方向（{fallback_key}）でページが進みました。"
                    "以降はこちらの方向を使用します。",
                    flush=True,
                )
                page_key = fallback_key
                current = candidate
                continue
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

    if not interrupted and len(paths) < args.min_pages:
        raise RuntimeError(
            f"撮影が{len(paths)}ページで止まりました（最低{args.min_pages}）。"
            "Kindleを前面のまま触らず、表紙から本文へ進むか確認して再実行してください。"
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError) as exc:
        print(f"エラー: {exc}", file=sys.stderr)
        raise SystemExit(1)
