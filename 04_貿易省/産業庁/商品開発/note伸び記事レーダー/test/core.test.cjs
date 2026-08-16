const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../lib/core.cjs");
const sheets = require("../lib/sheets.cjs");

function flight(value) {
  return `<script>self.__next_f.push(${JSON.stringify([1, value])})</script>`;
}

test("robots対象外パスを拒否する", () => {
  assert.throws(() => core.assertAllowedPublicUrl("https://note.com/api/v3/notes"));
  assert.throws(() => core.assertAllowedPublicUrl("https://note.com/user/followers"));
  assert.doesNotThrow(() => core.assertAllowedPublicUrl("https://note.com/hashtag/AI活用"));
});

test("ハッシュタグHTMLから公開記事メタデータを抽出する", () => {
  const html = flight('x:"note":{"key":"nabc123","title":"AIで売上を作る3つの方法","exactPublishAt":"2026-08-15T10:00:00.000+09:00","creatorName":"今田","likeCount":42,"price":980,"urlname":"imada"}');
  assert.deepEqual(core.extractNotesFromHtml(html, "AI活用"), [{
    key: "nabc123", title: "AIで売上を作る3つの方法", urlname: "imada", author: "今田",
    publishedAt: "2026-08-15T10:00:00.000+09:00", likes: 42, price: 980,
    url: "https://note.com/imada/n/nabc123", authorUrl: "https://note.com/imada", source: "AI活用",
  }]);
});

test("プロフィールHTMLから本人の公開フォロワー数を抽出する", () => {
  const html = flight('x"urlname":"imada","noteCount":15,"magazineCount":2,"followingCount":30,"followerCount":120,"isFollowing":false');
  assert.deepEqual(core.extractProfileFromHtml(html, "imada"), { noteCount: 15, following: 30, followers: 120 });
});

test("2回目以降は増加量を計算する", () => {
  const note = { key: "n1", title: "実践記", publishedAt: "2026-08-15T00:00:00Z", likes: 20, followers: 100, urlname: "u" };
  const previous = { articles: { n1: { likes: 10, observedAt: "2026-08-15T12:00:00Z" } }, authors: { u: { followers: 95 } } };
  const [ranked] = core.scoreArticles([note], previous, "2026-08-16T00:00:00Z", 30);
  assert.equal(ranked.likeDelta, 10);
  assert.equal(ranked.followerDelta, 5);
});

test("Sheets行は23列で揃う", () => {
  const article = core.scoreArticles([{ key: "n1", title: "AI入門3選", publishedAt: "2026-08-15T00:00:00Z", likes: 20, followers: 100, urlname: "u", url: "x", authorUrl: "y", author: "a", price: 0, source: "AI" }], { articles: {}, authors: {} }, "2026-08-16T00:00:00Z", 30)[0];
  const { header, rows } = sheets.rowsForArticles([article], "2026-08-16T00:00:00Z");
  assert.equal(header.length, 23);
  assert.equal(rows[0].length, 23);
});
