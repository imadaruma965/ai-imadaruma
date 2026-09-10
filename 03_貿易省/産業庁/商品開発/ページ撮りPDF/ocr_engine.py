#!/usr/bin/env python3
"""縦書き・横書き・漫画ページを、複数OCR候補から最良を選んでテキスト化する。"""

from __future__ import annotations

import re
import subprocess
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

JP_CHAR = r"\u3040-\u30ff\u3400-\u9fff"
JP_PUNCT = r"。、．，・！？!?「」『』（）()：:；;ー…‥―"
JP_CLASS = f"[{JP_CHAR}{JP_PUNCT}]"
KINDLE_NOISE = re.compile(
    r"^(Kindle|Amazon|章を読み終えるまで.*|\d{1,3}%|ee+|@@@+)$",
    re.IGNORECASE,
)
SPACE_BETWEEN_JP = re.compile(rf"(?<={JP_CLASS}) +(?={JP_CLASS})")


def _tesseract() -> str:
    from shutil import which

    found = which("tesseract")
    if found:
        return found
    for candidate in (
        Path.home() / ".local" / "bin" / "tesseract",
        Path("/opt/homebrew/bin/tesseract"),
        Path("/usr/local/bin/tesseract"),
    ):
        if candidate.is_file():
            return str(candidate)
    raise RuntimeError("tesseract が見つかりません")


def load_image(source: Path | bytes) -> Image.Image:
    if isinstance(source, bytes):
        return Image.open(BytesIO(source)).convert("RGB")
    return Image.open(source).convert("RGB")


def crop_reader_chrome(image: Image.Image) -> Image.Image:
    """Kindleヘッダー／フッター／矢印ボタンを落とす。"""
    width, height = image.size
    left = int(width * 0.03)
    top = int(height * 0.085)
    right = int(width * 0.97)
    bottom = int(height * 0.935)
    if right - left < 80 or bottom - top < 80:
        return image
    return image.crop((left, top, right, bottom))


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def tesseract_ocr(image: Image.Image, *, lang: str, psm: int) -> str:
    completed = subprocess.run(
        [_tesseract(), "stdin", "stdout", "-l", lang, "--psm", str(psm)],
        input=image_to_png_bytes(image),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        return ""
    return completed.stdout.decode("utf-8", errors="replace")


def normalize_jp_text(text: str) -> str:
    lines: list[str] = []
    for raw in text.splitlines():
        line = SPACE_BETWEEN_JP.sub("", raw.strip())
        line = re.sub(r" {2,}", " ", line)
        if not line or KINDLE_NOISE.match(line):
            continue
        if re.fullmatch(r"[\W_]+", line):
            continue
        lines.append(line)
    collapsed: list[str] = []
    for line in lines:
        if collapsed and collapsed[-1] == line:
            continue
        collapsed.append(line)
    return "\n".join(collapsed).strip()


def score_text(text: str) -> float:
    if not text:
        return -1.0
    jp = sum("\u3040" <= ch <= "\u30ff" or "\u4e00" <= ch <= "\u9fff" for ch in text)
    hira = sum("\u3040" <= ch <= "\u309f" for ch in text)
    runs = re.findall(rf"[{JP_CHAR}]{{5,}}", text)
    run_chars = sum(len(run) for run in runs)
    lines = [ln for ln in text.splitlines() if ln.strip()] or [""]
    short_ratio = sum(len(ln) <= 2 for ln in lines) / len(lines)
    latin_noise = len(re.findall(r"[A-Za-z]{4,}", text))
    return run_chars * 2.0 + hira * 1.5 + jp * 0.15 - short_ratio * 80 - latin_noise * 4


def _try_cv2_bubbles(image: Image.Image) -> list[Image.Image]:
    try:
        import cv2
        import numpy as np
    except ImportError:
        return []

    rgb = np.array(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    _, binary = cv2.threshold(gray, 210, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = gray.shape
    page_area = height * width
    boxes: list[tuple[int, int, int, int]] = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < page_area * 0.008 or area > page_area * 0.45:
            continue
        aspect = w / max(h, 1)
        if aspect < 0.25 or aspect > 4.5:
            continue
        boxes.append((x, y, w, h))
    boxes.sort(key=lambda box: (box[1] // max(height // 8, 1), -box[0]))
    crops: list[Image.Image] = []
    for x, y, w, h in boxes[:24]:
        pad = 8
        crop = image.crop(
            (
                max(0, x - pad),
                max(0, y - pad),
                min(width, x + w + pad),
                min(height, y + h + pad),
            )
        )
        if crop.size[0] >= 40 and crop.size[1] >= 40:
            crops.append(crop)
    return crops


def ocr_manga_regions(image: Image.Image) -> str:
    chunks: list[str] = []
    for crop in _try_cv2_bubbles(image)[:12]:
        primary = normalize_jp_text(tesseract_ocr(crop, lang="jpn_vert", psm=5))
        if score_text(primary) < 8:
            alt = normalize_jp_text(tesseract_ocr(crop, lang="jpn", psm=6))
            primary = alt if score_text(alt) > score_text(primary) else primary
        if score_text(primary) > 8:
            chunks.append(primary)
    return "\n".join(chunks).strip()


def is_confident(text: str, score: float) -> bool:
    hira = sum("\u3040" <= ch <= "\u309f" for ch in text)
    return score >= 80 and hira >= 20 and len(text) >= 40


def ocr_page_image(image: Image.Image) -> tuple[str, str, float]:
    """1ページをOCRする。戻り値は (本文, 採用モード, スコア)。"""
    page = crop_reader_chrome(image)
    primary = normalize_jp_text(tesseract_ocr(page, lang="jpn_vert", psm=5))
    primary_score = score_text(primary)
    if is_confident(primary, primary_score):
        return primary, "jpn_vert", primary_score

    candidates: list[tuple[str, str, float]] = [(primary, "jpn_vert", primary_score)]
    inverted = ImageOps.invert(page)
    for label, img, lang, psm in (
        ("jpn_vert_inv", inverted, "jpn_vert", 5),
        ("jpn", page, "jpn", 6),
        ("jpn_sparse", page, "jpn", 11),
    ):
        text = normalize_jp_text(tesseract_ocr(img, lang=lang, psm=psm))
        candidates.append((text, label, score_text(text)))

    best_text, best_mode, best_score = max(candidates, key=lambda item: item[2])
    if best_score < 80:
        manga = normalize_jp_text(ocr_manga_regions(page))
        manga_score = score_text(manga)
        if manga_score > best_score:
            return manga, "manga_regions", manga_score
    return best_text, best_mode, best_score


def ocr_image_file(path: Path) -> tuple[str, str, float]:
    return ocr_page_image(load_image(path))


def ocr_image_path(path: str) -> tuple[str, str, float]:
    """プロセスプール用。パス文字列だけを受け取る。"""
    return ocr_image_file(Path(path))
