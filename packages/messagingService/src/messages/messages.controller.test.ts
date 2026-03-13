import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers' | 'query'>>;
type TestResponse = Response & { statusCode: number; _json: unknown };

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

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

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as Request;
}
function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
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
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
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
    assert.deepEqual((res._json as { message: unknown }).message, message);
  });

  it('returns 400 with empty attachments and no content', async () => {
    const res = makeRes();
    await createMessage(makeReq({
      headers: { 'x-user-id': 'u1' },
      params: { serverId: 's1', channelId: 'c1' },
      body: { attachmentIds: [] },
    }), res);
    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MISSING_FIELDS');
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
    assert.deepEqual((res._json as { message: unknown }).message, message);
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
    assert.deepEqual((res._json as { messages: unknown[] }).messages, [{ _id: 'm1' }, { _id: 'm2' }]);
  });

  it('caps limit at 100', async () => {
    const messages: unknown[] = [];
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
    let capturedFilter: unknown;
    mockMessageFind.mock.mockImplementation((filter: unknown) => {
      capturedFilter = filter;
      return { sort: () => ({ limit: () => [] }) };
    });

    const res = makeRes();
    await listMessages(makeReq({ params: { channelId: 'c1' }, query: { before: 'cursor-id' } }), res);
    assert.deepEqual((capturedFilter as Record<string, unknown>)._id, { $lt: 'cursor-id' });
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
      (error) => assertErrorCode(error, 'MESSAGE_NOT_FOUND'),
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
      (error) => assertErrorCode(error, 'FORBIDDEN'),
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
