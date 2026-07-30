const test = require("node:test");
const assert = require("node:assert/strict");
const {
  sanitizeSpeechText,
  isSpeakableAssistantMessage,
  readEnabledFromStorage,
  writeEnabledToStorage,
  pickJapaneseVoice,
  isSpeechSupported,
  createSmartRabbitSpeechController,
  MAX_SPEECH_CHARS,
  LONG_SUFFIX,
  STORAGE_KEY,
} = require("./smart-rabbit-speech.js");

test("sanitizeSpeechText strips markdown headings and list markers", () => {
  const out = sanitizeSpeechText("## 見出し\n- 項目A\n1. 項目B\n**太字**と_斜体_");
  assert.equal(out.includes("#"), false);
  assert.equal(out.includes("**"), false);
  assert.match(out, /見出し/);
  assert.match(out, /項目A/);
  assert.match(out, /太字/);
});

test("sanitizeSpeechText removes fenced code blocks", () => {
  const out = sanitizeSpeechText("前\n```js\nsecret()\n```\n後");
  assert.equal(out.includes("secret"), false);
  assert.match(out, /前/);
  assert.match(out, /後/);
});

test("sanitizeSpeechText removes URLs", () => {
  const out = sanitizeSpeechText("詳細は https://example.com/path を見て www.foo.bar も");
  assert.equal(out.includes("https://"), false);
  assert.equal(out.includes("www."), false);
  assert.match(out, /詳細/);
});

test("sanitizeSpeechText truncates over max length with suffix", () => {
  const long = "あ".repeat(MAX_SPEECH_CHARS + 200);
  const out = sanitizeSpeechText(long);
  assert.ok(out.length < long.length);
  assert.ok(out.includes(LONG_SUFFIX));
  assert.ok(out.length <= MAX_SPEECH_CHARS + LONG_SUFFIX.length + 10);
});

test("sanitizeSpeechText returns empty for blank input", () => {
  assert.equal(sanitizeSpeechText("   "), "");
  assert.equal(sanitizeSpeechText(""), "");
});

test("isSpeakableAssistantMessage allows only successful assistant replies", () => {
  assert.equal(isSpeakableAssistantMessage({ role: "assistant", text: "はい", status: "ok" }), true);
  assert.equal(isSpeakableAssistantMessage({ role: "user", text: "質問" }), false);
  assert.equal(isSpeakableAssistantMessage({ role: "error", text: "失敗" }), false);
  assert.equal(isSpeakableAssistantMessage({ role: "assistant", text: "x", status: "error" }), false);
  assert.equal(isSpeakableAssistantMessage({ role: "assistant", text: "   " }), false);
  assert.equal(isSpeakableAssistantMessage(null), false);
});

test("localStorage speech setting round-trips without touching other keys", () => {
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
  };
  assert.equal(readEnabledFromStorage(storage), false);
  writeEnabledToStorage(true, storage);
  assert.equal(storage.getItem(STORAGE_KEY), "1");
  assert.equal(readEnabledFromStorage(storage), true);
  writeEnabledToStorage(false, storage);
  assert.equal(readEnabledFromStorage(storage), false);
});

test("pickJapaneseVoice prefers ja-JP then ja-*", () => {
  assert.equal(pickJapaneseVoice([]), null);
  const voices = [
    { name: "Samantha", lang: "en-US" },
    { name: "Kyoko", lang: "ja-JP" },
    { name: "Other", lang: "ja" },
  ];
  assert.equal(pickJapaneseVoice(voices).name, "Kyoko");
  assert.equal(pickJapaneseVoice([{ name: "Otoya", lang: "ja-JP" }]).lang, "ja-JP");
});

test("isSpeechSupported is false in Node without speechSynthesis", () => {
  assert.equal(isSpeechSupported({}), false);
  assert.equal(isSpeechSupported(undefined), false);
});

test("controller: OFF skips auto speak; ON speaks new assistant once only", () => {
  const spoken = [];
  const fakeUtterances = [];
  const g = {
    SpeechSynthesisUtterance: function FakeUtterance(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.voice = null;
      this.onend = null;
      this.onerror = null;
      fakeUtterances.push(this);
    },
    speechSynthesis: {
      getVoices: () => [{ name: "Kyoko", lang: "ja-JP" }],
      speak(u) {
        spoken.push(u.text);
      },
      cancel() {
        spoken.push("CANCEL");
      },
      addEventListener() {},
    },
  };
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
  };
  const ctl = createSmartRabbitSpeechController({ global: g, storage });
  const msg = { id: "m1", role: "assistant", text: "こんにちは", status: "ok" };

  assert.equal(ctl.maybeAutoSpeak(msg).reason, "disabled");
  assert.equal(spoken.length, 0);

  ctl.setEnabled(true);
  assert.equal(ctl.maybeAutoSpeak(msg).ok, true);
  assert.equal(spoken.filter((s) => s !== "CANCEL").length, 1);
  assert.equal(ctl.maybeAutoSpeak(msg).reason, "already_spoken");

  assert.equal(ctl.maybeAutoSpeak({ id: "u1", role: "user", text: "質問" }).reason, "not_speakable");
  assert.equal(ctl.maybeAutoSpeak({ id: "e1", role: "error", text: "失敗" }).reason, "not_speakable");
});

test("controller: speaking another message cancels the previous one", () => {
  let cancelCount = 0;
  const g = {
    SpeechSynthesisUtterance: function FakeUtterance(text) {
      this.text = text;
      this.lang = "ja-JP";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
    },
    speechSynthesis: {
      getVoices: () => [{ name: "Kyoko", lang: "ja-JP" }],
      speak() {},
      cancel() {
        cancelCount += 1;
      },
      addEventListener() {},
    },
  };
  const ctl = createSmartRabbitSpeechController({
    global: g,
    storage: { getItem: () => "1", setItem() {} },
  });
  ctl.setEnabled(true);
  ctl.speakMessage({ id: "a", role: "assistant", text: "一つ目", status: "ok" });
  ctl.speakMessage({ id: "b", role: "assistant", text: "二つ目", status: "ok" });
  assert.ok(cancelCount >= 1);
  assert.equal(ctl.getSpeakingMessageId(), "b");
  ctl.stop();
  assert.equal(ctl.getSpeakingMessageId(), null);
});

test("controller: unsupported browser does not throw", () => {
  const ctl = createSmartRabbitSpeechController({
    global: {},
    storage: { getItem: () => null, setItem() {} },
  });
  assert.equal(ctl.isSupported(), false);
  assert.equal(ctl.speakMessage({ id: "a", role: "assistant", text: "はい", status: "ok" }).reason, "unsupported");
  ctl.setEnabled(true);
  assert.equal(ctl.maybeAutoSpeak({ id: "a", role: "assistant", text: "はい", status: "ok" }).reason, "unsupported");
  ctl.stop();
});
