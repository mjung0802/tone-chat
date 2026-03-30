import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { healthRouter } from './health.routes.js';

describe('healthRouter', () => {
  it('is an Express Router', () => {
    assert.equal(typeof healthRouter, 'function');
  });
});
