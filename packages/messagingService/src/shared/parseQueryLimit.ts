/**
 * Parses a query-string `limit` value into a safe integer.
 * Handles NaN, Infinity, negative, and non-numeric inputs by falling back to the default.
 */
export function parseQueryLimit(raw: unknown, max = 100, fallback = 50): number {
  const n = Number(raw ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}
