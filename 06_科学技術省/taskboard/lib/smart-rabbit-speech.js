/**
 * Smart Rabbit 専用のブラウザ音声読み上げ。
 * 外部APIは使わず Web Speech API (speechSynthesis) のみ。
 * Node では sanitize / 設定判定などの純粋関数をテスト可能。
 */
(function (root) {
  const STORAGE_KEY = "smartRabbitSpeechEnabled";
  const MAX_SPEECH_CHARS = 3000;
  const LONG_SUFFIX = "回答が長いため、続きは画面で確認してください";

  function getGlobal() {
    return typeof globalThis !== "undefined" ? globalThis : root;
  }

  function isSpeechSupported(g = getGlobal()) {
    try {
      return Boolean(
        g &&
          g.speechSynthesis &&
          typeof g.SpeechSynthesisUtterance === "function"
      );
    } catch {
      return false;
    }
  }

  function stripQuotesNoise(text) {
    return String(text || "");
  }

  /**
   * 読み上げ用に Markdown / URL / 記号を最低限整形する。
   */
  function sanitizeSpeechText(raw, options = {}) {
    const maxChars = Number(options.maxChars) > 0 ? Number(options.maxChars) : MAX_SPEECH_CHARS;
    let text = stripQuotesNoise(raw);

    // fenced code blocks
    text = text.replace(/```[\s\S]*?```/g, " ");
    text = text.replace(/~~~[\s\S]*?~~~/g, " ");
    // inline code
    text = text.replace(/`[^`]*`/g, " ");
    // HTML tags
    text = text.replace(/<\/?[^>]+>/g, " ");
    // URLs
    text = text.replace(/https?:\/\/\S+/gi, " ");
    text = text.replace(/\bwww\.\S+/gi, " ");
    // knowledge / citation style lines
    text = text.replace(/^.*参照(した)?(情報|Knowledge|ナレッジ).*$/gim, " ");
    text = text.replace(/^.*参照Knowledge:.*$/gim, " ");
    // headings / list markers / quotes
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    text = text.replace(/^\s{0,3}>\s?/gm, "");
    text = text.replace(/^\s*([-*+]|\d+\.)\s+/gm, "");
    // bold/italic/strike leftovers
    text = text.replace(/(\*\*|__|~~|\*|_)/g, "");
    // emoji (basic ranges)
    text = text.replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,
      ""
    );
    // leftover markdown links [label](url) → label
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // excessive symbols
    text = text.replace(/[|#~<>{}[\]\\]+/g, " ");
    text = text.replace(/[ \t]+\n/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.replace(/[ \t]{2,}/g, " ");
    text = text.trim();

    if (!text) return "";

    if (text.length > maxChars) {
      const cut = text.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
      return `${cut}\n\n${LONG_SUFFIX}`;
    }
    return text;
  }

  function isSpeakableAssistantMessage(message) {
    if (!message || typeof message !== "object") return false;
    if (message.role !== "assistant") return false;
    if (message.status === "error" || message.status === "partial") return false;
    const text = String(message.text || "").trim();
    return Boolean(text);
  }

  function readEnabledFromStorage(storage) {
    try {
      const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      if (!store) return false;
      return store.getItem(STORAGE_KEY) === "1" || store.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  function writeEnabledToStorage(enabled, storage) {
    try {
      const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      if (!store) return false;
      store.setItem(STORAGE_KEY, enabled ? "1" : "0");
      return true;
    } catch {
      return false;
    }
  }

  function pickJapaneseVoice(voices) {
    const list = Array.isArray(voices) ? voices : [];
    if (!list.length) return null;
    const exact = list.find((v) => v.lang === "ja-JP");
    if (exact) return exact;
    const prefix = list.find((v) => String(v.lang || "").toLowerCase().startsWith("ja"));
    if (prefix) return prefix;
    return null;
  }

  function loadJapaneseVoice(g = getGlobal()) {
    if (!isSpeechSupported(g)) return null;
    try {
      return pickJapaneseVoice(g.speechSynthesis.getVoices() || []);
    } catch {
      return null;
    }
  }

  /**
   * @param {object} [deps]
   */
  function createSmartRabbitSpeechController(deps = {}) {
    const g = deps.global || getGlobal();
    const storage = deps.storage;
    const autoSpoken = new Set();
    let enabled = readEnabledFromStorage(storage);
    let speakingMessageId = null;
    let onStateChange = typeof deps.onStateChange === "function" ? deps.onStateChange : () => {};

    function notify() {
      onStateChange({
        enabled,
        supported: isSpeechSupported(g),
        speakingMessageId,
      });
    }

    function cancelSpeech() {
      try {
        if (isSpeechSupported(g)) g.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      speakingMessageId = null;
      notify();
    }

    function ensureVoicesHook() {
      if (!isSpeechSupported(g)) return;
      try {
        g.speechSynthesis.getVoices();
        if (typeof g.speechSynthesis.addEventListener === "function") {
          g.speechSynthesis.addEventListener("voiceschanged", () => {
            loadJapaneseVoice(g);
          });
        } else if ("onvoiceschanged" in g.speechSynthesis) {
          g.speechSynthesis.onvoiceschanged = () => loadJapaneseVoice(g);
        }
      } catch {
        /* ignore */
      }
    }

    ensureVoicesHook();

    return {
      STORAGE_KEY,
      MAX_SPEECH_CHARS,
      isSupported: () => isSpeechSupported(g),
      isEnabled: () => enabled,
      getSpeakingMessageId: () => speakingMessageId,
      wasAutoSpoken: (id) => autoSpoken.has(String(id || "")),
      markAutoSpoken(id) {
        if (id) autoSpoken.add(String(id));
      },
      clearAutoSpoken() {
        autoSpoken.clear();
      },
      setEnabled(next) {
        enabled = Boolean(next);
        writeEnabledToStorage(enabled, storage);
        if (!enabled) cancelSpeech();
        else notify();
        return enabled;
      },
      stop() {
        cancelSpeech();
      },
      /**
       * 手動再生。別メッセージ再生時は前を止める。
       */
      speakMessage(message, { auto = false } = {}) {
        if (!isSpeakableAssistantMessage(message)) {
          return { ok: false, reason: "not_speakable" };
        }
        if (!isSpeechSupported(g)) {
          return { ok: false, reason: "unsupported" };
        }
        const speechText = sanitizeSpeechText(message.text);
        if (!speechText) return { ok: false, reason: "empty_after_sanitize" };

        cancelSpeech();
        const utterance = new g.SpeechSynthesisUtterance(speechText);
        utterance.lang = "ja-JP";
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        const voice = loadJapaneseVoice(g);
        if (voice) utterance.voice = voice;

        const id = String(message.id || "");
        speakingMessageId = id || null;
        utterance.onend = () => {
          if (speakingMessageId === id) {
            speakingMessageId = null;
            notify();
          }
        };
        utterance.onerror = () => {
          if (speakingMessageId === id) {
            speakingMessageId = null;
            notify();
          }
        };

        try {
          g.speechSynthesis.speak(utterance);
          if (auto && id) autoSpoken.add(id);
          notify();
          return { ok: true, text: speechText, messageId: id, auto: Boolean(auto) };
        } catch (error) {
          speakingMessageId = null;
          notify();
          return { ok: false, reason: "speak_failed", error: String(error && error.message) };
        }
      },
      /**
       * 自動読み上げ: 音声ON・未読上げ・assistantのみ。
       */
      maybeAutoSpeak(message) {
        if (!enabled) return { ok: false, reason: "disabled" };
        if (!isSpeakableAssistantMessage(message)) return { ok: false, reason: "not_speakable" };
        const id = String(message.id || "");
        if (id && autoSpoken.has(id)) return { ok: false, reason: "already_spoken" };
        return this.speakMessage(message, { auto: true });
      },
    };
  }

  const api = {
    STORAGE_KEY,
    MAX_SPEECH_CHARS,
    LONG_SUFFIX,
    isSpeechSupported,
    sanitizeSpeechText,
    isSpeakableAssistantMessage,
    readEnabledFromStorage,
    writeEnabledToStorage,
    pickJapaneseVoice,
    loadJapaneseVoice,
    createSmartRabbitSpeechController,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.SmartRabbitSpeech = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
