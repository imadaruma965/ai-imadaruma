const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeIdeaMemo,
  createIdeaMemo,
  listOpenIdeaMemos,
  titleFromMemoText,
} = require("./idea-memos.js");

test("normalizeIdeaMemo fills defaults", () => {
  const m = normalizeIdeaMemo({ text: " 音の新商品案 " }, { uid: () => "im-fixed" });
  assert.equal(m.id, "im-fixed");
  assert.equal(m.text, "音の新商品案");
  assert.equal(m.status, "open");
  assert.equal(m.source, "manual");
});

test("createIdeaMemo + listOpenIdeaMemos sorts newest first", () => {
  const a = createIdeaMemo("古い", { uid: () => "a" });
  a.createdAt = "2026-08-01T00:00:00.000Z";
  const b = createIdeaMemo("新しい", { uid: () => "b", source: "cabinet", sourceMember: "eiichi" });
  b.createdAt = "2026-08-03T00:00:00.000Z";
  const archived = createIdeaMemo("捨てる", { uid: () => "c" });
  archived.status = "archived";
  const open = listOpenIdeaMemos([a, archived, b]);
  assert.deepEqual(
    open.map((m) => m.id),
    ["b", "a"]
  );
  assert.equal(open[0].sourceMember, "eiichi");
});

test("titleFromMemoText uses first line", () => {
  assert.equal(titleFromMemoText("一行目\n二行目"), "一行目");
  assert.equal(titleFromMemoText(""), "アイデアメモ");
});
