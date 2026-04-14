import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { mutationLimiters, createPerUserRateLimiter } = await import('./rateLimiters.js');

describe('mutationLimiters', () => {
  it('exports message, serverWrite, invite, and memberAction limiters', () => {
    assert.ok(typeof mutationLimiters.message === 'function', 'message limiter should be a function');
    assert.ok(typeof mutationLimiters.serverWrite === 'function', 'serverWrite limiter should be a function');
    assert.ok(typeof mutationLimiters.invite === 'function', 'invite limiter should be a function');
    assert.ok(typeof mutationLimiters.memberAction === 'function', 'memberAction limiter should be a function');
  });
});

describe('createPerUserRateLimiter', () => {
  it('is exported as a function', () => {
    assert.equal(typeof createPerUserRateLimiter, 'function');
  });

  it('returns a rate limiter middleware function', () => {
    const limiter = createPerUserRateLimiter(60 * 1000, 10, 'Too many requests');
    assert.equal(typeof limiter, 'function');
  });
});
