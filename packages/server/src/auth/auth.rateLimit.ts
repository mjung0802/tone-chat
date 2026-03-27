import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

function createRateLimiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message, status: 429 } },
  });
}

/** Rate limiter keyed by user ID (from requireAuth middleware) instead of IP */
function createPerUserRateLimiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req as { userId?: string }).userId ?? req.ip ?? 'unknown',
    message: { error: { code: 'TOO_MANY_REQUESTS', message, status: 429 } },
  });
}

export const authRateLimiters = {
  login: createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts. Try again later.'),
  register: createRateLimiter(60 * 60 * 1000, 3, 'Too many registration attempts. Try again later.'),
  refresh: createRateLimiter(15 * 60 * 1000, 10, 'Too many refresh attempts. Try again later.'),
  verifyEmail: createRateLimiter(15 * 60 * 1000, 10, 'Too many verification attempts. Try again later.'),
  verifyEmailPerUser: createPerUserRateLimiter(15 * 60 * 1000, 5, 'Too many verification attempts for this account. Try again later.'),
  resendVerification: createRateLimiter(60 * 60 * 1000, 5, 'Too many resend attempts. Try again later.'),
};
