// 音声サービス（Phase 2-1）。speak() のみ SpeechSynthesis に対応。listen()/stop() はインターフェースのみ
// （マイク入力の本実装は次Phase以降）。

(function (root) {
  function hasSpeechSynthesis() {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance === "function"
    );
  }

  const VoiceService = {
    speak(text, opts = {}) {
      const value = String(text || "").trim();
      if (!value) return { ok: false, stub: false, reason: "empty_text" };
      if (hasSpeechSynthesis()) {
        const utterance = new window.SpeechSynthesisUtterance(value);
        if (opts.lang) utterance.lang = opts.lang;
        if (opts.rate) utterance.rate = opts.rate;
        window.speechSynthesis.speak(utterance);
        return { ok: true, method: "speechSynthesis", text: value };
      }
      console.log("[VoiceService.speak] SpeechSynthesis未対応環境のスタブ", value);
      return { ok: true, method: "stub", text: value };
    },
    listen() {
      console.log("[VoiceService.listen] Phase 2-1では未実装（マイク入力は次Phase以降）");
      return { ok: false, stub: true, reason: "not_implemented" };
    },
    stop() {
      if (hasSpeechSynthesis()) {
        window.speechSynthesis.cancel();
        return { ok: true, method: "speechSynthesis" };
      }
      console.log("[VoiceService.stop] スタブ実装");
      return { ok: true, method: "stub" };
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VoiceService };
  }
  if (typeof window !== "undefined") {
    window.VoiceService = VoiceService;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
