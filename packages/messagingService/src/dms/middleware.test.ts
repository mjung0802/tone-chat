import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type ConvMiddlewareReq = Request & { conversation?: unknown };
type TestResponse = Response & { statusCode: number; _json: unknown };

const mockFindById = mock.fn<AnyFn>();

mock.module('./conversation.model.js', {
  namedExports: {
    DirectConversation: { findById: mockFindById },
  },
});

const { requireConversationParticipant } = await import('./middleware.js');

function makeReq(
  overrides: Partial<Pick<Request, 'params' | 'headers'>> = {},
): ConvMiddlewareReq {
  return { params: {}, headers: {}, ...overrides } as ConvMiddlewareReq;
}

function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (d: unknown) => {
    res._json = d;
    return res;
  };
  return res;
}

describe('requireConversationParticipant', () => {
  beforeEach(() => mockFindById.mock.resetCalls());

  it('returns 401 when x-user-id header is missing', async () => {
    const res = makeRes();
    const next = mock.fn();
    await requireConversationParticipant(
      makeReq({ params: { conversationId: 'conv1' } }),
      res,
      next,
    );
    assert.equal(res.statusCode, 401);
    assert.equal((res._json as { error: { code: string } }).error.code, 'UNAUTHORIZED');
    assert.equal(next.mock.callCount(), 0);
  });

  it('returns 404 when conversation does not exist', async () => {
    mockFindById.mock.mockImplementation(async () => null);
    const res = makeRes();
    const next = mock.fn();
    await requireConversationParticipant(
      makeReq({ headers: { 'x-user-id': 'u1' }, params: { conversationId: 'conv1' } }),
      res,
      next,
    );
    assert.equal(res.statusCode, 404);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      'CONVERSATION_NOT_FOUND',
    );
    assert.equal(next.mock.callCount(), 0);
  });

  it('returns 403 NOT_A_PARTICIPANT when user is not a participant', async () => {
    const conversation = { _id: 'conv1', participantIds: ['u2', 'u3'] };
    mockFindById.mock.mockImplementation(async () => ({
      ...conversation,
      includes: (id: string) => conversation.participantIds.includes(id),
    }));
    const res = makeRes();
    const next = mock.fn();
    await requireConversationParticipant(
      makeReq({ headers: { 'x-user-id': 'u1' }, params: { conversationId: 'conv1' } }),
      res,
      next,
    );
    assert.equal(res.statusCode, 403);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      'NOT_A_PARTICIPANT',
    );
    assert.equal(next.mock.callCount(), 0);
  });

  it('calls next and attaches conversation when user is a participant', async () => {
    const conversation = {
      _id: 'conv1',
      participantIds: { includes: (id: string) => ['u1', 'u2'].includes(id) },
    };
    mockFindById.mock.mockImplementation(async () => conversation);
    const req = makeReq({ headers: { 'x-user-id': 'u1' }, params: { conversationId: 'conv1' } });
    const res = makeRes();
    const next = mock.fn();
    await requireConversationParticipant(req, res, next);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(req.conversation, conversation);
  });
});
