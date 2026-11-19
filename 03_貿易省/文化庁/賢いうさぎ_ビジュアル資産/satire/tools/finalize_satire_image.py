#!/usr/bin/env python3
"""
finalize_satire_image.py — 風刺画ルール§3規律1/10/11を、生成後の後処理で確定させる。

生成ツールの出力はサイズ・色・落款がぶれるため、この3点をスクリプトで固定する:
  1. 画像比率を厳密に 1080x1350 (4:5) にする（規律11）
  2. 背景2値を正確なHEX (#FEDB02 / #F9EECC) に寄せる（規律1）。ただし黒いハッチング線や
     キャラクターの色を壊さないよう、明るい（背景らしい）画素にだけ補正をかける
  3. 右下の落款を、保存済みのマスター画像でピクセル単位に貼り込む（規律10）

2026-10-14改訂: プロンプト側で「AIは落款を描かない・右下の隅を空けておく」よう指示する運用に
変更した。そのため、このスクリプトはもう「AIが描いた落款を検出して消す」処理をしない——
単純に、右下の隅へ透明PNGの落款を重ねて貼るだけになった。対象が右下まで伸びる構図（長い手足・
大きな物体など）の場合は、プロンプト側で隅を空けるよう指示を入れること（§8雛形参照）。それでも
はみ出した場合は、このスクリプトではなく生成をやり直す。

2026-10-22改訂: 同日中に背景を白／クリーム一色`PAGE_HEX`へ切り替える変更を一度入れたが、
BOSSが両案を比較した上で「やはり、この風刺画のカラーでいく」とマスタード／クリームのツートン
を最終決裁（風刺画ルール§3規律1）。既定の色補正を**マスタード／クリームのツートン
（`--two-tone-legacy`だったもの）に戻し**、白一色の`PAGE_HEX`補正は`--single-tone-unused`
側（不採用・記録用）に回した。

2026-11-04改訂（実験・BOSS指示）: 絵に一言のタイトルを入れる運用を試す。日本語の文字は生成AIに
描かせると崩れるため、絵は文字なしで生成し、`--title`で上の壁に明朝体で置く（行の区切りは`|`）。
タイトルを入れる場合、プロンプト側で上部（高さ約8〜26%）を空けておくこと。

Usage:
    python3 finalize_satire_image.py <input.png> <output.png> [--crop-anchor top|center|bottom]
        [--title "一行目|二行目"] [--title-size 76] [--title-y 150] [--title-style mincho|hand|hand-med|kyokasho]

既定の前提:
  - 入力は「上：マスタードの壁／下：クリームの床」の二層構成（風刺画ルールの標準構図）
  - マスター落款: ../../キャラマスター/烏龍_落款マスター_v2.png（RGBA・透明背景。v1はRGB/不透明で
    背景に四角いパッチが出るため2026-10-13に置き換え）
  - 出力キャンバスでの落款位置: 右下から余白48pxの位置に固定
  - 右下の隅は生成時点で空いている前提（§8雛形でAIに指示済み）。このスクリプトは、もう
    その隅を塗りつぶしたりはしない
"""
import sys
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

TARGET_W, TARGET_H = 1080, 1350  # 4:5
TARGET_RATIO = TARGET_W / TARGET_H

MUSTARD_HEX = (0xFE, 0xDB, 0x02)
CREAM_HEX = (0xF9, 0xEE, 0xCC)
PAGE_HEX = (0xFB, 0xF8, 0xED)  # 2026-10-22: single-tone white/cream page tried for 風刺画, not adopted (BOSS reverted to mustard two-tone same day)

HERE = Path(__file__).resolve().parent
SEAL_MASTER = HERE.parent.parent / "キャラマスター" / "烏龍_落款マスター_v2.png"  # 2026-10-22: BOSS final decision — red seal
SEAL_MASTER_BLACK_UNUSED = HERE.parent.parent / "キャラマスター" / "烏龍_落款マスター_黒_v1.png"  # tried, not adopted; kept for the record
SEAL_MARGIN = 48  # px from the bottom-right corner, at target canvas scale

TITLE_INK = (0x1C, 0x1A, 0x17)  # near-black ink, same family as the hatching
# 2026-11-04: title styles. 'hand' = Klee (pen-handwriting-like, Apple font) with per-character
# jitter so it reads as hand-lettered; 'kyokasho' = textbook-style handwriting; 'mincho' = typeset.
# Fonts are looked up at run time (Apple's downloadable fonts live under AssetsV2) and are NOT copied
# into the repo. (glob pattern, face index, jitter?)
TITLE_STYLES = {
    "mincho":   ("/System/Library/Fonts/ヒラギノ明朝 ProN.ttc", 2, False),
    "hand":     ("/System/Library/AssetsV2/com_apple_MobileAsset_Font7/*/AssetData/Klee.ttc", 0, True),
    "hand-med": ("/System/Library/AssetsV2/com_apple_MobileAsset_Font7/*/AssetData/Klee.ttc", 1, True),
    "kyokasho": ("/System/Library/AssetsV2/com_apple_MobileAsset_Font7/*/AssetData/Kyokasho.ttc", 3, True),
}


def crop_to_ratio(im: Image.Image, anchor: str) -> Image.Image:
    w, h = im.size
    src_ratio = w / h
    if abs(src_ratio - TARGET_RATIO) < 1e-6:
        return im
    if src_ratio < TARGET_RATIO:
        # source is relatively taller than target -> crop height, keep full width
        new_h = round(w / TARGET_RATIO)
        new_h = min(new_h, h)
        if anchor == "top":
            top = 0
        elif anchor == "bottom":
            top = h - new_h
        else:
            top = (h - new_h) // 2
        box = (0, top, w, top + new_h)
    else:
        # source is relatively wider than target -> crop width, keep full height
        new_w = round(h * TARGET_RATIO)
        new_w = min(new_w, w)
        if anchor == "left":
            left = 0
        elif anchor == "right":
            left = w - new_w
        else:
            left = (w - new_w) // 2
        box = (left, 0, left + new_w, h)
    return im.crop(box)


def sample_patch(arr: np.ndarray, cx: float, cy: float, r: int = 10) -> np.ndarray:
    h, w, _ = arr.shape
    x, y = int(w * cx), int(h * cy)
    patch = arr[max(0, y - r):y + r, max(0, x - r):x + r].reshape(-1, 3)
    return patch.mean(axis=0)


def correct_background_colors(
    im: Image.Image, threshold: float = 55.0, max_strength: float = 0.9, two_tone: bool = True
) -> Image.Image:
    """Blend background-like pixels toward the exact brand hex values.

    Safer than a global linear remap: only pixels close in colour to the sampled
    background tone(s) are pulled toward their target, and the blend strength
    fades out with distance — so paper-grain noise is not amplified, and dark
    ink hatching / the character / the seal are left untouched.

    2026-10-22: default is two-tone mustard/cream again (BOSS final decision,
    reversing the same-day single-tone PAGE_HEX attempt). Pass two_tone=False
    to use the unadopted single-tone white/cream page instead.
    """
    arr = np.array(im).astype(np.float64)

    if two_tone:
        # Sample points assumed clear of the subject: top-left corner (wall) and
        # bottom-left corner (floor). Adjust here if a composition breaks this.
        targets = [
            (sample_patch(arr, 0.04, 0.03), np.array(MUSTARD_HEX, dtype=np.float64)),
            (sample_patch(arr, 0.04, 0.95), np.array(CREAM_HEX, dtype=np.float64)),
        ]
    else:
        page_actual = sample_patch(arr, 0.04, 0.03)
        targets = [(page_actual, np.array(PAGE_HEX, dtype=np.float64))]

    out = arr.copy()
    for actual, target in targets:
        dist = np.linalg.norm(arr - actual[None, None, :], axis=2)
        weight = np.clip(1.0 - dist / threshold, 0.0, 1.0) * max_strength
        weight = weight[:, :, None]
        out = out * (1 - weight) + (target[None, None, :] * np.ones_like(out)) * weight

    out = np.clip(out, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGB")


def stamp_seal(im: Image.Image, seal_path: Path = SEAL_MASTER) -> Image.Image:
    """Paste the fixed master seal at a pixel-identical position every time.

    2026-10-14改訂: prompts now instruct the AI to never draw a seal and to
    keep the bottom-right corner clear, so there is nothing to detect or wipe
    here anymore — just a direct paste using the seal's own alpha channel.
    2026-10-22: briefly tried a black seal for the new white page, but BOSS
    decided the red seal (SEAL_MASTER) stays even on white — only the page
    background and character linework changed, not the seal.

    If the composition's subject extends into that reserved corner (long
    limbs, large objects), this paste will sit on top of it. Check the output;
    if it looks wrong, fix the prompt and regenerate rather than patching here.
    """
    if not seal_path.exists():
        print(f"[warn] seal master not found at {seal_path}; skipping seal stamp", file=sys.stderr)
        return im
    seal = Image.open(seal_path).convert("RGBA")
    im = im.copy()

    x = im.width - seal.width - SEAL_MARGIN
    y = im.height - seal.height - SEAL_MARGIN
    im.paste(seal, (x, y), seal)  # seal's own alpha channel as the paste mask
    return im


def draw_title(im: Image.Image, title: str, size: int = 76, top: int = 150,
               line_gap: float = 1.35, tracking: int = 4, style: str = "mincho",
               seed: int = 7) -> Image.Image:
    """Set a short title (lines split by '|') centred on the upper wall, in ink.

    2026-11-04: experiment — the picture itself carries no text (the generator
    mangles Japanese), so the title is typeset here instead. `top` is the y of
    the first line's top edge on the 1080x1350 canvas. For the handwriting-like
    styles each character gets a small random rotation / baseline shift / size
    change and a slightly dry-ink edge, so it reads as lettered by hand.
    """
    import glob, random
    from PIL import ImageDraw, ImageFont, ImageFilter
    pattern, index, jitter = TITLE_STYLES[style]
    found = glob.glob(pattern)
    if not found:
        print(f"[warn] title font for style '{style}' not found ({pattern}); skipping title", file=sys.stderr)
        return im
    rng = random.Random(seed)
    im = im.convert("RGBA")
    y = top
    for line in title.split("|"):
        fonts = []
        for ch in line:
            sz = round(size * (rng.uniform(0.96, 1.05) if jitter else 1.0))
            fonts.append(ImageFont.truetype(found[0], sz, index=index))
        d0 = ImageDraw.Draw(im)
        widths = [d0.textlength(ch, font=f) for ch, f in zip(line, fonts)]
        gap = tracking + (6 if jitter else 0)
        total = sum(widths) + gap * (len(line) - 1)
        x = (im.width - total) / 2
        for ch, f, w in zip(line, fonts, widths):
            layer = Image.new("L", (int(size * 2), int(size * 2)), 0)
            ImageDraw.Draw(layer).text((size * 0.5, size * 0.4), ch, font=f, fill=255)
            if jitter:
                layer = layer.rotate(rng.uniform(-3.5, 3.5), resample=Image.BICUBIC)
                # dry-ink texture: thin out the stroke a little at random
                arr = np.asarray(layer).astype(np.float32)
                noise = np.array([[rng.random() for _ in range(layer.width)] for _ in range(layer.height)], dtype=np.float32)
                arr = arr * (1.0 - 0.55 * (noise > 0.965))
                layer = Image.fromarray(arr.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
            dy = rng.uniform(-6, 6) if jitter else 0
            ink = Image.new("RGBA", layer.size, TITLE_INK + (255,))
            ink.putalpha(layer)
            im.alpha_composite(ink, (round(x - size * 0.5), round(y + dy - size * 0.4)))
            x += w + gap
        y += round(size * line_gap)
    return im.convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument(
        "--crop-anchor", default="center", choices=["top", "center", "bottom", "left", "right"],
        help="which edge of the source to KEEP when cropping to 4:5: 'top' keeps the top and trims "
             "the bottom (can cut the character's feet); 'bottom' keeps the bottom and trims the "
             "top; 'center' trims both evenly (default, safest).",
    )
    ap.add_argument("--title", default=None,
                    help="one-line title set on the upper wall; split lines with '|' (2026-11-04 experiment)")
    ap.add_argument("--title-size", type=int, default=76)
    ap.add_argument("--title-style", default="mincho", choices=sorted(TITLE_STYLES),
                    help="mincho = typeset Mincho; hand / hand-med = Klee with per-character jitter "
                         "(hand-lettered feel); kyokasho = textbook-style handwriting")
    ap.add_argument("--title-seed", type=int, default=7, help="jitter seed for the hand styles")
    ap.add_argument("--title-y", type=int, default=150, help="top y of the first title line (px, 1080x1350 canvas)")
    ap.add_argument("--no-color-correct", action="store_true")
    ap.add_argument("--no-seal", action="store_true")
    ap.add_argument(
        "--single-tone-unused", action="store_true",
        help="use the single-tone white/cream PAGE_HEX correction tried on 2026-10-22 and not "
             "adopted, instead of the default mustard/cream two-tone background.",
    )
    ap.add_argument(
        "--black-seal-tried", action="store_true",
        help="use the black seal that was tried on 2026-10-22 and not adopted (kept only for comparison).",
    )
    args = ap.parse_args()

    im = Image.open(args.input).convert("RGB")
    im = crop_to_ratio(im, args.crop_anchor)
    im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)

    if not args.no_color_correct:
        im = correct_background_colors(im, two_tone=not args.single_tone_unused)

    if args.title:
        im = draw_title(im, args.title, size=args.title_size, top=args.title_y,
                        style=args.title_style, seed=args.title_seed)

    if not args.no_seal:
        im = stamp_seal(im, seal_path=SEAL_MASTER_BLACK_UNUSED if args.black_seal_tried else SEAL_MASTER)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    im.save(args.output)
    print(f"saved {args.output} ({im.size[0]}x{im.size[1]})")


if __name__ == "__main__":
    main()
