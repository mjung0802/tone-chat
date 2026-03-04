import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockGetUserById = mock.fn<AnyFn>();
const mockGetUsersByIds = mock.fn<AnyFn>();
const mockUpdateUser = mock.fn<AnyFn>();

mock.module('./users.service.js', {
  namedExports: { getUserById: mockGetUserById, getUsersByIds: mockGetUsersByIds, updateUser: mockUpdateUser },
});

const { getMe, patchMe, getUser, getUsersBatch } = await import('./users.controller.js');

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

describe('getUsersBatch', () => {
  beforeEach(() => mockGetUsersByIds.mock.resetCalls());

  it('returns 400 when ids is not an array', async () => {
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: 'not-array' } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'INVALID_IDS');
  });

  it('returns 400 when ids is empty', async () => {
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: [] } }), res);
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 when ids contains non-string elements', async () => {
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: [123, null] } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'INVALID_IDS');
  });

  it('returns 400 when batch size exceeds 100', async () => {
    const res = makeRes();
    const ids = Array.from({ length: 101 }, (_, i) => `u${i}`);
    await getUsersBatch(makeReq({ body: { ids } }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'BATCH_TOO_LARGE');
  });

  it('returns 200 with users (email stripped)', async () => {
    const users = [
      { id: 'u1', username: 'alice', email: 'alice@test.com' },
      { id: 'u2', username: 'bob', email: 'bob@test.com' },
    ];
    mockGetUsersByIds.mock.mockImplementation(async () => users);
    const res = makeRes();
    await getUsersBatch(makeReq({ body: { ids: ['u1', 'u2'] } }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res._json.users.length, 2);
    assert.equal(res._json.users[0].email, undefined);
    assert.equal(res._json.users[1].email, undefined);
  });
});
