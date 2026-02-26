import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockGetUserById = mock.fn();
const mockUpdateUser = mock.fn();

await mock.module('./users.service.js', {
  namedExports: { getUserById: mockGetUserById, updateUser: mockUpdateUser },
});

const { getMe, patchMe, getUser } = await import('./users.controller.js');

function makeReq(overrides: Partial<{ body: any; params: any; headers: any; query: any }> = {}) {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as any;
}
function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  return res;
}

describe('getMe', () => {
  beforeEach(() => mockGetUserById.mock.resetCalls());

  it('returns 400 when X-User-Id missing', async () => {
    const res = makeRes();
    await getMe(makeReq(), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'MISSING_USER_ID');
  });

  it('returns 200 with user', async () => {
    const user = { id: 'u1', username: 'alice' };
    mockGetUserById.mock.mockImplementation(async () => user);
    const res = makeRes();
    await getMe(makeReq({ headers: { 'x-user-id': 'u1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.user, user);
  });
});

describe('patchMe', () => {
  beforeEach(() => mockUpdateUser.mock.resetCalls());

  it('returns 400 when X-User-Id missing', async () => {
    const res = makeRes();
    await patchMe(makeReq({ body: { display_name: 'Alice' } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 200 with updated user', async () => {
    const user = { id: 'u1', display_name: 'Alice' };
    mockUpdateUser.mock.mockImplementation(async () => user);
    const res = makeRes();
    await patchMe(makeReq({ headers: { 'x-user-id': 'u1' }, body: { display_name: 'Alice' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.user, user);
  });
});

describe('getUser', () => {
  beforeEach(() => mockGetUserById.mock.resetCalls());

  it('returns 200 with user by params id', async () => {
    const user = { id: 'u2', username: 'bob' };
    mockGetUserById.mock.mockImplementation(async () => user);
    const res = makeRes();
    await getUser(makeReq({ params: { id: 'u2' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.user, user);
  });
});
