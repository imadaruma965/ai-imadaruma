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

  // opts.voiceNames: 優先したい音声名の部分一致リスト（例: 男性声 ["Otoya", "Hattori", "Ichiro"]）。
  // 一致する音声が端末にインストールされていない場合は opts.lang のデフォルト音声にフォールバックする。
  function pickVoice(opts) {
    if (!hasSpeechSynthesis()) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const names = opts.voiceNames || [];
    for (const name of names) {
      const match = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    if (opts.lang) {
      const shortLang = opts.lang.split("-")[0];
      const match = voices.find((v) => v.lang === opts.lang || v.lang.startsWith(shortLang));
      if (match) return match;
    }
    return null;
  }

  const VoiceService = {
    speak(text, opts = {}) {
      const value = String(text || "").trim();
      if (!value) return { ok: false, stub: false, reason: "empty_text" };
      if (hasSpeechSynthesis()) {
        const utterance = new window.SpeechSynthesisUtterance(value);
        if (opts.lang) utterance.lang = opts.lang;
        if (opts.rate) utterance.rate = opts.rate;
        const voice = pickVoice(opts);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
        return { ok: true, method: "speechSynthesis", text: value, voice: voice ? voice.name : null };
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
    // Chrome等は音声リストを非同期で読み込むため、早めに一度呼んで読み込みを開始させる。
    if (hasSpeechSynthesis()) window.speechSynthesis.getVoices();
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
