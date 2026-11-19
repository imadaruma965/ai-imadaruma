const test = require("node:test");
const assert = require("node:assert/strict");
const dash = require("../dashboard.cjs");

function xRecord(overrides) {
  return {
    "投稿日": "2026-11-19", "曜日": "木", "投稿時刻": "09:00", "投稿URL": "https://x.com/u/1",
    "冒頭3行のフック": "フック文", "投稿全文": "本文", "文字数": 50,
    "発信ジャンル": ["行動"], "投稿テーマ": "テーマ", "損失の種類": ["時間的損失"],
    "投稿形式": "箇条書き", "フックの種類": "具体的な数字", "複眼設計の種類": ["実体験"],
    "実体験の有無": "○", "画像の有無": "○", "外部リンクの有無": "×", "投稿の目的": "送客",
    "インプレッション_72h": 1000, "いいね_72h": 50, "リポスト_72h": 5, "リプライ_72h": 2,
    "ブックマーク_72h": 10, "詳細クリック_72h": 4, "プロフィールアクセス_72h": 20,
    "フォロー獲得数_72h": 3, "リンククリック_72h": 6,
    ...overrides,
  };
}

test("Xデータが空でもダッシュボードは例外を投げない", () => {
  const { html } = dash.buildXSection([], 5);
  assert.match(html, /記録がまだありません/);
});

test("Xデータがあるとき各セクションを含むHTMLを生成する", () => {
  const records = [xRecord({ "投稿URL": "https://x.com/u/1" }), xRecord({ "投稿URL": "https://x.com/u/2", "発信ジャンル": ["お金"] })];
  const { html } = dash.buildXSection(records, 5);
  assert.match(html, /発信ジャンル別/);
  assert.match(html, /週間推移/);
  assert.match(html, /上位5投稿/);
});

test("noteデータが空でも例外を投げない", () => {
  const html = dash.buildNoteSection([]);
  assert.match(html, /記録がまだありません/);
});

test("ページ全体のHTMLが組み立てられる", () => {
  const html = dash.page({ generatedAt: "2026-11-19T00:00:00Z", xHtml: "<p>x</p>", noteHtml: "<p>n</p>", hypoHtml: "<p>h</p>" });
  assert.match(html, /<!doctype html>/);
  assert.match(html, /烏龍式・SNS発信研究室/);
  assert.match(html, /#FEDB02/);
});
