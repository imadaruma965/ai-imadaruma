const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_CONNECT",
]);

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function errorChain(error) {
  const parts = [];
  const seen = new Set();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    parts.push(current);
    current = current.cause;
  }
  return parts;
}

function formatError(error) {
  return errorChain(error)
    .map((item) => {
      const bits = [item.name, item.message, item.code, item.status || item.statusCode];
      return bits.filter((bit) => bit != null && bit !== "").join(" ");
    })
    .join(" <- ");
}

function isRetryable(error, response) {
  if (response && RETRYABLE_STATUS.has(Number(response.status))) return true;
  for (const item of errorChain(error)) {
    const name = String(item.name || "");
    const message = String(item.message || "");
    const code = item.code;
    const status = Number(item.status || item.statusCode || item.response?.status);
    if (name === "AbortError" || /aborted|timeout/i.test(message)) return true;
    if (message.includes("fetch failed")) return true;
    if (RETRYABLE_CODES.has(String(code || ""))) return true;
    if (RETRYABLE_STATUS.has(status)) return true;
  }
  return false;
}

function sleep(ms, impl = (delay) => new Promise((resolve) => setTimeout(resolve, delay))) {
  return impl(ms);
}

async function fetchText(url, options = {}) {
  const {
    delayMs = 0,
    timeoutMs = 25_000,
    retries = 3,
    headers = { "user-agent": "ImadarumaNoteResearch/0.1 (public metadata research; low frequency)", accept: "text/html,application/xhtml+xml" },
    fetchImpl = fetch,
    sleepImpl,
  } = options;

  if (delayMs) await sleep(delayMs, sleepImpl);

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      const backoff = Math.min(8_000, 1_000 * 2 ** (attempt - 1));
      console.error(`再試行 ${attempt}/${retries} (${backoff}ms): ${url}`);
      await sleep(backoff, sleepImpl);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { headers, redirect: "follow", signal: controller.signal });
      if (!response.ok) {
        const statusError = new Error(`${response.status} ${response.statusText}: ${url}`);
        statusError.status = response.status;
        if (attempt < retries && isRetryable(statusError, response)) {
          lastError = statusError;
          continue;
        }
        throw statusError;
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryable(error, error.status ? { status: error.status } : null)) continue;
      throw new Error(formatError(error));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(formatError(lastError));
}

async function retryAsync(worker, options = {}) {
  const { retries = 3, label = "処理", sleepImpl } = options;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await worker();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryable(error, error.status ? { status: error.status } : null)) break;
      const backoff = Math.min(8_000, 1_000 * 2 ** attempt);
      console.error(`${label}を再試行 ${attempt + 1}/${retries} (${backoff}ms): ${formatError(error)}`);
      await sleep(backoff, sleepImpl);
    }
  }
  throw lastError;
}

module.exports = {
  RETRYABLE_CODES,
  RETRYABLE_STATUS,
  errorChain,
  fetchText,
  formatError,
  isRetryable,
  retryAsync,
};
