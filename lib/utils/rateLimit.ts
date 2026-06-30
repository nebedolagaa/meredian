import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

/**
 * Best-effort, in-process fixed-window rate limiter.
 *
 * NOTE: on serverless / multi-instance deployments each instance keeps its own
 * counters, so this is a pragmatic guardrail against bursts and casual abuse
 * rather than a strict global limit. For hard global limits, back this with a
 * shared store (e.g. Upstash Redis / Vercel KV) using the same interface.
 */
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the current window resets (0 when allowed). */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so the map stays bounded under sustained traffic.
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (now > b.resetAt) buckets.delete(k);
    });
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/**
 * Resolve the client IP from proxy headers (Vercel sets `x-forwarded-for`).
 * Falls back to a constant so unknown clients still share a single bucket.
 */
export function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
