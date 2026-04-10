import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Import via dynamic import (ESM)
const { mutationLimiters } = await import('./rateLimiters.js');

describe('mutationLimiters', () => {
  it('exports message, serverWrite, invite, and memberAction limiters', () => {
    assert.ok(typeof mutationLimiters.message === 'function', 'message limiter should be a function');
    assert.ok(typeof mutationLimiters.serverWrite === 'function', 'serverWrite limiter should be a function');
    assert.ok(typeof mutationLimiters.invite === 'function', 'invite limiter should be a function');
    assert.ok(typeof mutationLimiters.memberAction === 'function', 'memberAction limiter should be a function');
  });
});
