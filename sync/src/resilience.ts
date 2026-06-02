// The retry / backoff / concurrency layer the WhoopClient lacks. Wraps each API
// call so a multi-year backfill survives 5xx, 429s, and cold starts.
// @ts-ignore - compiled JS from the parent package
import { WhoopServerError, WhoopApiError } from "../../dist/whoop/errors.js";

export interface RetryOpts {
  attempts?: number; // default 5
  baseMs?: number; // default 500
  maxMs?: number; // default 30_000
}

function isRetryable(err: any): boolean {
  if (err instanceof WhoopServerError) return true; // 5xx
  if (err instanceof WhoopApiError) return err.status === 429; // rate limited
  // network/timeouts (AbortError, fetch failures) → retry
  const name = err?.name;
  return name === "AbortError" || name === "TypeError" || name === "FetchError";
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const attempts = opts.attempts ?? 5;
  const baseMs = opts.baseMs ?? 500;
  const maxMs = opts.maxMs ?? 30_000;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      const backoff = Math.min(maxMs, baseMs * 2 ** i);
      const jitter = backoff * (0.5 + ((i * 2654435761) % 1000) / 2000); // deterministic jitter (no Math.random)
      await sleep(Math.round(jitter));
    }
  }
  throw lastErr;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Bounded-concurrency map (default 3) so a big backfill doesn't hammer WHOOP. */
export async function pMap<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Circuit breaker: abort the whole run after N consecutive failures. */
export class CircuitBreaker {
  private consecutive = 0;
  constructor(private threshold = 8) {}
  ok(): void {
    this.consecutive = 0;
  }
  fail(): void {
    this.consecutive++;
    if (this.consecutive >= this.threshold) {
      throw new Error(`Circuit breaker tripped after ${this.consecutive} consecutive failures — aborting run.`);
    }
  }
}
