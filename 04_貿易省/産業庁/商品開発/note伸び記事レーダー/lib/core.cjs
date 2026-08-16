const fs = require("node:fs");
const path = require("node:path");

const BLOCKED_PATHS = [
  /^\/api(?:\/|$)/,
  /^\/search(?:\/|$)/,
  /^\/embed(?:\/|$)/,
  /^\/preview(?:\/|$)/,
  /^\/pdf(?:\/|$)/,
  /\/followers(?:\/|$)/,
  /\/followings(?:\/|$)/,
  /\/likes(?:\/|$)/,
];

function assertAllowedPublicUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== "note.com") {
    throw new Error(`note.com の公開HTTPSページだけ取得できます: ${rawUrl}`);
  }
  if (BLOCKED_PATHS.some((pattern) => pattern.test(url.pathname))) {
    throw new Error(`robots.txt対象外のため取得しません: ${url.pathname}`);
  }
  return url;
}

function extractNextFlightText(html) {
  const chunks = [];
  const re = /self\.__next_f\.push\((\[.*?\])\)<\/script>/gs;
  for (const match of String(html || "").matchAll(re)) {
    try {
      const value = JSON.parse(match[1]);
      if (typeof value[1] === "string") chunks.push(value[1]);
    } catch {
      // note側の別形式チャンクは無視し、読める公開メタデータだけを使う。
    }
  }
  return chunks.join("\n");
}

function fieldString(block, name) {
  const match = block.match(new RegExp(`"${name}":"((?:\\\\.|[^"\\\\])*)"`));
  if (!match) return "";
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1];
  }
}

function fieldNumber(block, name) {
  const match = block.match(new RegExp(`"${name}":(-?[0-9]+(?:\\.[0-9]+)?)`));
  return match ? Number(match[1]) : null;
}

function extractNotesFromHtml(html, sourceLabel = "") {
  const payload = extractNextFlightText(html);
  const starts = [...payload.matchAll(/"note":\{"key":"(n[a-zA-Z0-9]+)"/g)];
  const notes = new Map();
  for (let index = 0; index < starts.length; index += 1) {
    const match = starts[index];
    const end = starts[index + 1]?.index ?? Math.min(payload.length, match.index + 12000);
    const block = payload.slice(match.index, end);
    const key = match[1];
    const title = fieldString(block, "title");
    const urlname = fieldString(block, "urlname");
    const exactPublishAt = fieldString(block, "exactPublishAt");
    const likeCount = fieldNumber(block, "likeCount");
    if (!title || !urlname || !exactPublishAt || likeCount === null) continue;
    const candidate = {
      key,
      title,
      urlname,
      author: fieldString(block, "creatorName"),
      publishedAt: exactPublishAt,
      likes: likeCount,
      price: fieldNumber(block, "price") ?? 0,
      url: `https://note.com/${urlname}/n/${key}`,
      authorUrl: `https://note.com/${urlname}`,
      source: sourceLabel,
    };
    const current = notes.get(key);
    if (!current || candidate.title.length > current.title.length) notes.set(key, candidate);
  }
  return [...notes.values()];
}

function extractProfileFromHtml(html, expectedUrlname) {
  const payload = extractNextFlightText(html);
  const marker = `"urlname":"${String(expectedUrlname).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`;
  let offset = 0;
  while (true) {
    const index = payload.indexOf(marker, offset);
    if (index === -1) return { followers: null, following: null, noteCount: null };
    const block = payload.slice(index, index + 3500);
    const match = block.match(
      /"noteCount":([0-9]+),"magazineCount":[0-9]+,"followingCount":([0-9]+),"followerCount":([0-9]+)/
    );
    if (match) {
      return { noteCount: Number(match[1]), following: Number(match[2]), followers: Number(match[3]) };
    }
    offset = index + marker.length;
  }
}

function hoursBetween(from, to) {
  return Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000);
}

function analyzeTitle(title) {
  const text = String(title || "");
  const themes = [];
  const rules = [
    ["AI", /AI|ChatGPT|Claude|生成AI|プロンプト/i],
    ["収益化", /収益|稼|売れ|副業|起業|マネタイズ|仕事/],
    ["発信・note", /note|記事|文章|発信|SNS|フォロワー/],
    ["自己成長", /習慣|人生|自分|学び|成長|行動|心/],
    ["実践記", /やってみた|実践|体験|失敗|成功|検証|日記/],
  ];
  for (const [label, pattern] of rules) if (pattern.test(text)) themes.push(label);
  let hook = "説明型";
  if (/なぜ|理由|正体|知らない|真実/.test(text)) hook = "好奇心・問題提起";
  else if (/方法|コツ|手順|攻略|ロードマップ|テンプレ|選/.test(text)) hook = "解決手順";
  else if (/失敗|後悔|やめた|できなかった/.test(text)) hook = "失敗・告白";
  else if (/\?|？/.test(text)) hook = "問いかけ";
  const hasNumber = /[0-9０-９]+/.test(text);
  const hasBracket = /[【〖「『]/.test(text);
  const audience = /初心者|はじめて|入門/.test(text) ? "初心者" : /経営|個人事業|会社員|親|子育て/.exec(text)?.[0] || "明示なし";
  return { themes: themes.join("・") || "その他", hook, hasNumber, hasBracket, audience, titleLength: [...text].length };
}

function scoreArticles(notes, previousState, observedAt, maxAgeDays) {
  const now = new Date(observedAt);
  return notes
    .map((note) => {
      const ageHours = Math.max(1, hoursBetween(note.publishedAt, now));
      const ageDays = ageHours / 24;
      const previous = previousState.articles?.[note.key];
      const elapsedHours = previous ? Math.max(0.25, hoursBetween(previous.observedAt, observedAt)) : null;
      const likeDelta = previous ? note.likes - previous.likes : null;
      const followers = note.followers ?? null;
      const previousAuthor = previousState.authors?.[note.urlname];
      const followerDelta = followers !== null && previousAuthor ? followers - previousAuthor.followers : null;
      const likesPerDay = note.likes / Math.max(ageDays, 0.25);
      const engagement = followers > 0 ? note.likes / followers : null;
      const likeVelocity = likeDelta !== null ? likeDelta / elapsedHours : 0;
      const followerVelocity = followerDelta !== null ? followerDelta / elapsedHours : 0;
      const baseline = Math.log1p(likesPerDay) * 34 + Math.log1p(note.likes) * 9 + Math.log1p((engagement || 0) * 100) * 12;
      const growth = Math.max(0, likeVelocity) * 22 + Math.max(0, followerVelocity) * 12;
      return {
        ...note,
        ageHours,
        likesPerDay,
        engagement,
        likeDelta,
        followerDelta,
        likeVelocity,
        followerVelocity,
        score: baseline + growth,
        analysis: analyzeTitle(note.title),
      };
    })
    .filter((note) => note.ageHours <= maxAgeDays * 24)
    .sort((a, b) => b.score - a.score || b.likes - a.likes);
}

function loadState(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return { version: 1, articles: {}, authors: {} };
  }
}

function saveState(filePath, articles, observedAt) {
  const state = { version: 1, observedAt, articles: {}, authors: {} };
  for (const article of articles) {
    state.articles[article.key] = { likes: article.likes, observedAt };
    if (article.followers !== null && article.followers !== undefined) {
      state.authors[article.urlname] = { followers: article.followers, observedAt };
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

module.exports = {
  analyzeTitle,
  assertAllowedPublicUrl,
  extractNextFlightText,
  extractNotesFromHtml,
  extractProfileFromHtml,
  loadState,
  saveState,
  scoreArticles,
};
