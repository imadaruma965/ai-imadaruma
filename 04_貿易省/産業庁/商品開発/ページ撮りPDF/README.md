# ページ撮りPDF（macOS）

**電子書籍のページを自動撮影し、一冊のPDFにまとめるMacツール。**

Mac版Kindleのウィンドウ全体を1ページずつ撮影し、右矢印キーでページを送り、最後に画像PDFへまとめます。右矢印を押しても画面が変わらない状態が3回続くと最終ページと判定します。

ご自身が正当に利用できる書籍を、許可された範囲で扱ってください。作成したPDFの共有・配布や、DRMの回避を行うツールではありません。

## 準備

ターミナルでこのディレクトリへ移動し、仮想環境と依存パッケージを用意します。

```bash
cd 04_貿易省/産業庁/商品開発/ページ撮りPDF
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

macOSの「システム設定 → プライバシーとセキュリティ」で、使用するターミナル（Terminal、iTerm、IDEなど）に次を許可してください。

- アクセシビリティ（Kindleへキーを送るため）
- 画面収録（スクリーンショットのため）

## 実行

1. Kindleで対象の本を開き、1ページ表示にする。
2. 最初に収録したいページを表示する。
3. Kindleウィンドウの上に別のウィンドウが重ならないようにする。
4. 次を実行する。

```bash
python kindle_to_pdf.py --output ~/Desktop/book.pdf --keep-images
```

5秒後に撮影が始まります。実行中はKindleや他のアプリを操作しないでください。緊急停止する場合は、マウスポインターを画面の左上隅へ動かします。`Control+C`でも停止できます。停止時点までの画像からPDFが作成されます。

動作確認後、ページ画像が不要なら `--keep-images` を外せます。

## 主な調整項目

```bash
python kindle_to_pdf.py \
  --output ~/Desktop/book.pdf \
  --page-delay 1.5 \
  --change-timeout 10 \
  --same-checks 3 \
  --threshold 0.8 \
  --keep-images
```

- 読み込みが遅い本では `--page-delay` や `--change-timeout` を増やします。
- 最終ページで微小な描画変化が続いて止まらない場合は `--threshold` を少し増やします（例: `1.5`）。
- ページ変化が小さい本で誤停止する場合は `--threshold` を減らします（例: `0.3`）。
- 念のため最大5000ページで停止します。`--max-pages` で変更できます。

最初は数ページだけの資料で動作確認し、PDFとページ順を確認してから長い本に使うことを推奨します。
