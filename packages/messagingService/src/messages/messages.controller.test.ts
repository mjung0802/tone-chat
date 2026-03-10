import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockMessageCreate = mock.fn<AnyFn>();
const mockMessageFind = mock.fn<AnyFn>();
const mockMessageFindOne = mock.fn<AnyFn>();

mock.module('./message.model.js', {
  namedExports: {
    Message: {
      create: mockMessageCreate,
      find: mockMessageFind,
      findOne: mockMessageFindOne,
    },
  },
});

const { createMessage, listMessages, updateMessage } = await import('./messages.controller.js');

function makeReq(overrides: Partial<{ body: any; params: any; headers: any; query: any }> = {}) {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as any;
}
function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  res.end = () => res;
  return res;
}

describe('createMessage', () => {
  beforeEach(() => mockMessageCreate.mock.resetCalls());

  it('returns 400 when content missing', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: {},
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'MISSING_FIELDS');
  });

  it('returns 201 with attachments only (no content)', async () => {
    const message = { _id: 'm2', content: '', attachmentIds: ['att-1'] };
    mockMessageCreate.mock.mockImplementation(async () => message);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { attachmentIds: ['att-1'] },
    }), res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res._json.message, message);
  });

  it('returns 400 with empty attachments and no content', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { attachmentIds: [] },
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'MISSING_FIELDS');
  });

  it('returns 201 with message', async () => {
    const message = { _id: 'm1', content: 'hello' };
    mockMessageCreate.mock.mockImplementation(async () => message);

    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { content: 'hello' },
    }), res);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res._json.message, message);
  });
});

describe('listMessages', () => {
  beforeEach(() => mockMessageFind.mock.resetCalls());

  it('defaults limit to 50 and returns reversed messages', async () => {
    const messages = [{ _id: 'm2' }, { _id: 'm1' }];
    mockMessageFind.mock.mockImplementation(() => ({
      sort: () => ({ limit: () => messages }),
    }));

    const res = makeRes();
    await listMessages(makeReq({ params: { channelId: 'c1' }, query: {} }), res);
    assert.equal(res.statusCode, 200);
    // messages.reverse() is called
    assert.deepEqual(res._json.messages, [{ _id: 'm1' }, { _id: 'm2' }]);
  });

  it('caps limit at 100', async () => {
    const messages: any[] = [];
    let capturedLimit: number | undefined;
    mockMessageFind.mock.mockImplementation(() => ({
      sort: () => ({
        limit: (n: number) => { capturedLimit = n; return messages; },
      }),
    }));

    const res = makeRes();
    await listMessages(makeReq({ params: { channelId: 'c1' }, query: { limit: '999' } }), res);
    assert.equal(capturedLimit, 100);
  });

  it('applies cursor pagination with before', async () => {
    let capturedFilter: any;
    mockMessageFind.mock.mockImplementation((filter: any) => {
      capturedFilter = filter;
      return { sort: () => ({ limit: () => [] }) };
    });

    const res = makeRes();
    await listMessages(makeReq({ params: { channelId: 'c1' }, query: { before: 'cursor-id' } }), res);
    assert.deepEqual(capturedFilter._id, { $lt: 'cursor-id' });
  });
});

describe('updateMessage', () => {
  beforeEach(() => mockMessageFindOne.mock.resetCalls());

  it('throws MESSAGE_NOT_FOUND when null', async () => {
    mockMessageFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => updateMessage(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { channelId: 'c1', messageId: 'm1' },
        body: { content: 'edited' },
      }), makeRes()),
      (err: any) => { assert.equal(err.code, 'MESSAGE_NOT_FOUND'); return true; },
    );
  });

  it('throws FORBIDDEN when not author', async () => {
    mockMessageFindOne.mock.mockImplementation(async () => ({ authorId: 'other' }));
    await assert.rejects(
      () => updateMessage(makeReq({
        headers: { 'x-user-id': 'u1' },
        params: { channelId: 'c1', messageId: 'm1' },
        body: { content: 'edited' },
      }), makeRes()),
      (err: any) => { assert.equal(err.code, 'FORBIDDEN'); return true; },
    );
  });

  it('sets editedAt and returns 200', async () => {
    const message = { authorId: 'u1', content: 'old', editedAt: null as Date | null, save: mock.fn(async () => {}) };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await updateMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { channelId: 'c1', messageId: 'm1' },
      body: { content: 'edited' },
    }), res);

    assert.equal(message.content, 'edited');
    assert.ok(message.editedAt instanceof Date);
    assert.equal(message.save.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
  });
});
