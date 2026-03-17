import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRoleLevel, isAbove } from './roles.js';

describe('getRoleLevel', () => {
  it('returns 0 for member', () => {
    assert.equal(getRoleLevel('member', false), 0);
  });

  it('returns 1 for mod', () => {
    assert.equal(getRoleLevel('mod', false), 1);
  });

  it('returns 2 for admin', () => {
    assert.equal(getRoleLevel('admin', false), 2);
  });

  it('returns 3 (owner level) regardless of role when isOwner is true', () => {
    assert.equal(getRoleLevel('member', true), 3);
    assert.equal(getRoleLevel('admin', true), 3);
  });
});

describe('isAbove', () => {
  it('admin is above member', () => {
    assert.ok(isAbove('admin', false, 'member', false));
  });

  it('admin is above mod', () => {
    assert.ok(isAbove('admin', false, 'mod', false));
  });

  it('mod is above member', () => {
    assert.ok(isAbove('mod', false, 'member', false));
  });

  it('member is not above member', () => {
    assert.ok(!isAbove('member', false, 'member', false));
  });

  it('mod is not above admin', () => {
    assert.ok(!isAbove('mod', false, 'admin', false));
  });

  it('owner is above admin', () => {
    assert.ok(isAbove('admin', true, 'admin', false));
  });

  it('nobody is above owner', () => {
    assert.ok(!isAbove('admin', false, 'admin', true));
  });
});
