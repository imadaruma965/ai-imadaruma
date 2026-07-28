const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSmartRabbitContext,
  contextToPromptText,
  freshnessOf,
  clipText,
  extractRoadmapGoal,
  extractOfferProducts,
  extractInstagramProfile,
  MODE_CHAR_LIMITS,
} = require("./smart-rabbit-context.cjs");

const NOW = new Date("2026-07-28T09:00:00+09:00");

const ALL_MODES = ["general", "today", "sales", "instagram", "research", "product", "finance"];

test("buildSmartRabbitContext generates a context for all seven MVP modes", () => {
  ALL_MODES.forEach((mode) => {
    const context = buildSmartRabbitContext({ mode, state: {}, userMessage: "hi", knowledgeResults: null, now: NOW });
    assert.equal(context.mode, mode);
    assert.ok(Array.isArray(context.sections));
    assert.ok(Array.isArray(context.warnings));
    assert.ok(Array.isArray(context.sourceSummary));
  });
});

test("buildSmartRabbitContext tolerates an old/legacy state shape missing newer fields", () => {
  const legacyState = { tasks: [{ id: "1", title: "旧タスク", status: "todo" }] };
  ALL_MODES.forEach((mode) => {
    assert.doesNotThrow(() => buildSmartRabbitContext({ mode, state: legacyState, now: NOW }));
  });
});

test("buildSmartRabbitContext does not crash on null/undefined/malformed state", () => {
  const malformed = [null, undefined, {}, { tasks: null }, { salesPipeline: "not-an-array" }, { fiscalMeta: "x" }, { business: 42 }];
  malformed.forEach((state) => {
    ALL_MODES.forEach((mode) => {
      assert.doesNotThrow(() => buildSmartRabbitContext({ mode, state, now: NOW }));
    });
  });
});

test("missing fiscalMeta values are reported as 未登録, never coerced to 0", () => {
  const state = { fiscalMeta: { currentBalance: null, defenseLine: null, confirmedInflow: null, expectedInflow: null, fixedCosts: null } };
  const context = buildSmartRabbitContext({ mode: "finance", state, now: NOW });
  const text = contextToPromptText(context);
  assert.match(text, /未登録/);
  assert.doesNotMatch(text, /現在残高: 0円/);
});

test("each section caps at 5 facts even when the underlying data is large", () => {
  const tasks = Array.from({ length: 50 }, (_, i) => ({
    id: `t${i}`,
    title: `期限超過タスク${i}`,
    status: "todo",
    dueDate: "2026-01-01",
  }));
  const context = buildSmartRabbitContext({ mode: "today", state: { tasks }, now: NOW });
  const issues = context.sections.find((s) => s.key === "issues");
  assert.ok(issues);
  assert.ok(issues.facts.length <= 5);
});

test("assembled prompt text stays within a reasonable multiple of the mode's char budget under heavy state", () => {
  const bigSalesPipeline = Array.from({ length: 200 }, (_, i) => ({
    id: `sp${i}`,
    companyName: `会社${i}`,
    status: "contacted",
    nextAction: "フォロー",
    nextActionDate: "2020-01-01",
    estimatedAmount: 10000,
  }));
  const bigTasks = Array.from({ length: 200 }, (_, i) => ({
    id: `t${i}`,
    title: `タスク${i}`.repeat(5),
    status: "todo",
    dueDate: "2020-01-01",
    category: `cat${i % 10}`,
  }));
  ALL_MODES.forEach((mode) => {
    const context = buildSmartRabbitContext({
      mode,
      state: { tasks: bigTasks, salesPipeline: bigSalesPipeline },
      now: NOW,
    });
    const text = contextToPromptText(context);
    assert.ok(
      text.length <= MODE_CHAR_LIMITS[mode] * 2,
      `${mode}: text length ${text.length} exceeds 2x budget ${MODE_CHAR_LIMITS[mode] * 2}`
    );
  });
});

test("CURSOR_API_KEY and other env secrets never leak into the generated context", () => {
  const original = process.env.CURSOR_API_KEY;
  process.env.CURSOR_API_KEY = "cursor_super_secret_value_123";
  try {
    ALL_MODES.forEach((mode) => {
      const context = buildSmartRabbitContext({ mode, state: {}, now: NOW });
      const text = JSON.stringify(context) + contextToPromptText(context);
      assert.equal(text.includes("cursor_super_secret_value_123"), false);
    });
  } finally {
    if (original === undefined) delete process.env.CURSOR_API_KEY;
    else process.env.CURSOR_API_KEY = original;
  }
});

test("sales mode surfaces sales pipeline facts (not buried by unrelated sections)", () => {
  const state = {
    salesPipeline: [
      { id: "1", companyName: "A社", status: "proposal", nextActionDate: "2020-01-01", nextAction: "見積送付", estimatedAmount: 80000 },
    ],
  };
  const context = buildSmartRabbitContext({ mode: "sales", state, now: NOW });
  assert.equal(context.sections[0].key, "sales");
  const text = contextToPromptText(context);
  assert.match(text, /A社/);
});

test("instagram mode surfaces the account's positioning ahead of generic sections", () => {
  const context = buildSmartRabbitContext({ mode: "instagram", state: {}, now: NOW });
  if (context.sections.length) {
    assert.equal(context.sections[0].key, "instagram_profile");
  }
});

test("instagram mode prefers state.business.instagram over the markdown fallback once populated", () => {
  const state = {
    business: {
      instagram: { brandName: "テストブランド", tagline: "タグ", pillars: ["A", "B"], updatedAt: "2026-07-28T00:00:00.000Z" },
    },
  };
  const context = buildSmartRabbitContext({ mode: "instagram", state, now: NOW });
  const section = context.sections.find((s) => s.key === "instagram_profile");
  assert.ok(section);
  assert.equal(section.source, "state.business.instagram");
  assert.match(contextToPromptText(context), /テストブランド/);
});

test("research mode distinguishes confirmed findings from unconfirmed hypotheses", () => {
  const state = {
    business: {
      researchProjects: [
        { theme: "競合価格調査", confirmed: true, nextStep: "" },
        { theme: "新市場仮説", confirmed: false, nextStep: "一次情報を探す" },
      ],
    },
  };
  const context = buildSmartRabbitContext({ mode: "research", state, now: NOW });
  const text = contextToPromptText(context);
  assert.match(text, /確認済み/);
  assert.match(text, /仮説・未確認/);
});

test("research mode reports 未登録 (not fabricated projects) when state.business.researchProjects is empty", () => {
  const context = buildSmartRabbitContext({ mode: "research", state: {}, now: NOW });
  const text = contextToPromptText(context);
  assert.match(text, /未登録/);
});

test("product mode returns a structured product list with name and price", () => {
  const state = { business: { services: [{ name: "商品A", price: "5万円", status: "販売中" }] } };
  const context = buildSmartRabbitContext({ mode: "product", state, now: NOW });
  const section = context.sections.find((s) => s.key === "products");
  assert.ok(section);
  assert.match(section.facts[0], /商品A/);
  assert.match(section.facts[0], /5万円/);
});

test("freshnessOf classifies missing/invalid dates as unknown and old dates as stale", () => {
  assert.equal(freshnessOf(null, NOW), "unknown");
  assert.equal(freshnessOf("not-a-date", NOW), "unknown");
  assert.equal(freshnessOf("2026-07-27T00:00:00.000Z", NOW), "fresh");
  assert.equal(freshnessOf("2026-01-01T00:00:00.000Z", NOW), "stale");
});

test("clipText truncates long strings and leaves short ones untouched", () => {
  assert.equal(clipText("短い", 10), "短い");
  const long = "あ".repeat(200);
  assert.ok(clipText(long, 140).length <= 140);
});

test("extractRoadmapGoal pulls deadline/goal without throwing on malformed markdown", () => {
  const good = "| **期限** | 2026年11月30日 |\n| **目標** | 月商50万円 |\n";
  const facts = extractRoadmapGoal(good);
  assert.ok(facts.some((f) => f.includes("2026年11月30日")));
  assert.doesNotThrow(() => extractRoadmapGoal("not a table at all"));
  assert.deepEqual(extractRoadmapGoal(""), []);
});

test("extractOfferProducts parses numbered product sections without throwing on malformed input", () => {
  const md = [
    "## 1. 商品A",
    "| **価格** | 1万円 |",
    "| **AI栄一の判断** | 主戦場 |",
    "## 2. 商品B",
    "| **価格** | 要設定 |",
  ].join("\n");
  const products = extractOfferProducts(md);
  assert.equal(products.length, 2);
  assert.equal(products[0].name, "商品A");
  assert.equal(products[0].price, "1万円");
  assert.doesNotThrow(() => extractOfferProducts("no headings here"));
  assert.deepEqual(extractOfferProducts(""), []);
});

test("extractInstagramProfile pulls positioning text without throwing on malformed input", () => {
  const md = "**主軸**\n\n```text\nAxis A\n```\n\n**副軸**\n\n```text\nAxis B\n```\n";
  const facts = extractInstagramProfile(md);
  assert.ok(facts.some((f) => f.includes("Axis A")));
  assert.ok(facts.some((f) => f.includes("Axis B")));
  assert.doesNotThrow(() => extractInstagramProfile(""));
});
