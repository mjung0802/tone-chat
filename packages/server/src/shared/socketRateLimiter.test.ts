import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { createSocketRateLimiter } = await import('./socketRateLimiter.js');

describe('createSocketRateLimiter', () => {
  it('allows the first request', () => {
    const check = createSocketRateLimiter(60_000, 3);
    assert.ok(check('user-1'));
  });

  it('allows up to the limit', () => {
    const check = createSocketRateLimiter(60_000, 3);
    assert.ok(check('user-1'));
    assert.ok(check('user-1'));
    assert.ok(check('user-1'));
  });

  it('blocks the request that exceeds the limit', () => {
    const check = createSocketRateLimiter(60_000, 3);
    check('user-1');
    check('user-1');
    check('user-1');
    assert.ok(!check('user-1'));
  });

  it('tracks users independently', () => {
    const check = createSocketRateLimiter(60_000, 1);
    assert.ok(check('user-1'));
    assert.ok(!check('user-1'));
    assert.ok(check('user-2')); // user-2 window is separate
  });

  it('resets after window expires', async () => {
    const check = createSocketRateLimiter(10, 1); // 10ms window
    assert.ok(check('user-1'));
    assert.ok(!check('user-1'));
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(check('user-1')); // window has reset
  });
});
