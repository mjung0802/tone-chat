interface LimiterEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates an in-memory per-user fixed-window rate limiter for socket handlers.
 * Returns a check function: `check(userId) => boolean` (true = allowed, false = rate-limited).
 *
 * Create once at module level — the Map is shared across all socket connections.
 */
export function createSocketRateLimiter(windowMs: number, limit: number): (userId: string) => boolean {
  const store = new Map<string, LimiterEntry>();

  return function check(userId: string): boolean {
    const now = Date.now();
    const entry = store.get(userId);

    if (!entry || now >= entry.resetAt) {
      store.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  };
}
