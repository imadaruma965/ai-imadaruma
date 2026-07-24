const test = require("node:test");
const assert = require("node:assert/strict");
const { VoiceService } = require("./voice-service.js");

test("speak() falls back to a stub when SpeechSynthesis is unavailable (Node has no window)", () => {
  const result = VoiceService.speak("今日の一事を設定してください");
  assert.equal(result.ok, true);
  assert.equal(result.method, "stub");
});

test("speak() with empty text does not call the stub and reports failure", () => {
  const result = VoiceService.speak("");
  assert.equal(result.ok, false);
});

test("listen() is not implemented in Phase 2-1 and says so explicitly", () => {
  const result = VoiceService.listen();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not_implemented");
});

test("stop() is a no-op stub outside a browser", () => {
  const result = VoiceService.stop();
  assert.equal(result.ok, true);
});
