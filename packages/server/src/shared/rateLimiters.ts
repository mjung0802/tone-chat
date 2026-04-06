import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

function createPerUserRateLimiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req as { userId?: string }).userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
    message: { error: { code: 'TOO_MANY_REQUESTS', message, status: 429 } },
  });
}

export const mutationLimiters = {
  /** 30 messages per minute per user */
  message: createPerUserRateLimiter(60 * 1000, 30, 'Too many messages. Slow down.'),
  /** 10 server/channel write operations per 10 minutes per user */
  serverWrite: createPerUserRateLimiter(10 * 60 * 1000, 10, 'Too many server operations. Try again later.'),
  /** 20 invite operations per 10 minutes per user */
  invite: createPerUserRateLimiter(10 * 60 * 1000, 20, 'Too many invite operations. Try again later.'),
  /** 30 moderation actions per 10 minutes per user */
  memberAction: createPerUserRateLimiter(10 * 60 * 1000, 30, 'Too many moderation actions. Try again later.'),
};
