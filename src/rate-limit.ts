import {
  FREE_LIMIT,
  RATE_WINDOW_SECONDS,
  MEMORY_LIMIT_PER_MINUTE,
} from "./constants.js";
import type { RateLimitResult } from "./types.js";

/** In-memory rate limiter (fallback when KV unavailable) */
const memoryStore = new Map<string, { ts: number; count: number }>();

function memoryRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(ip);

  if (!entry || now - entry.ts > 60_000) {
    memoryStore.set(ip, { ts: now, count: 1 });
    return {
      allowed: true,
      remaining: MEMORY_LIMIT_PER_MINUTE - 1,
      total: MEMORY_LIMIT_PER_MINUTE,
    };
  }

  if (entry.count >= MEMORY_LIMIT_PER_MINUTE) {
    return { allowed: false, remaining: 0, total: MEMORY_LIMIT_PER_MINUTE };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: MEMORY_LIMIT_PER_MINUTE - entry.count,
    total: MEMORY_LIMIT_PER_MINUTE,
  };
}

/** Check rate limit via KV (daily) with memory fallback */
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  ip: string,
): Promise<RateLimitResult> {
  if (!kv) return memoryRateLimit(ip);

  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:ag:${ip}:${today}`;

  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch {
    return memoryRateLimit(ip);
  }

  if (count >= FREE_LIMIT) {
    return { allowed: false, remaining: 0, total: FREE_LIMIT, used: count };
  }

  try {
    await kv.put(key, String(count + 1), {
      expirationTtl: RATE_WINDOW_SECONDS,
    });
  } catch {
    // KV write failed — still allow this request
  }

  return {
    allowed: true,
    remaining: FREE_LIMIT - count - 1,
    total: FREE_LIMIT,
    used: count + 1,
  };
}
