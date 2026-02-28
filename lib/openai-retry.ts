import OpenAI from "openai";

/**
 * Wraps an OpenAI API call with automatic retry + exponential backoff.
 * Respects the `retry-after` header OpenAI sends with 429 responses.
 * Retries on 429 (rate limit) and 5xx (server errors).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 6,
  baseDelayMs = 8000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      const message = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;
      const isRateLimit = status === 429 || message.includes("429") || message.toLowerCase().includes("rate limit");
      const isServerError = status === 500 || status === 503 || status === 529 ||
        message.includes("500") || message.includes("503") || message.includes("529");

      if (!isRateLimit && !isServerError) throw err; // non-retryable error
      if (attempt === maxRetries) break;

      // Try to read retry-after from OpenAI's error headers
      let delayMs = baseDelayMs * Math.pow(2, attempt); // 8s, 16s, 32s, 64s, 128s, 256s

      if (err instanceof OpenAI.APIError) {
        const retryAfter = err.headers?.["retry-after"];
        if (retryAfter) {
          const seconds = parseFloat(retryAfter);
          if (!isNaN(seconds)) {
            // Add a 1s buffer on top of what OpenAI says
            delayMs = Math.max(delayMs, (seconds + 1) * 1000);
          }
        }
      }

      // Cap at 5 minutes just in case
      delayMs = Math.min(delayMs, 5 * 60 * 1000);

      console.log(`[withRetry] attempt ${attempt + 1}/${maxRetries} — waiting ${Math.round(delayMs / 1000)}s before retry`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError;
}
