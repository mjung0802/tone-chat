import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers' | 'query'>>;
type TestResponse = Response & { statusCode: number; _json: unknown };

const mockAuditLogFind = mock.fn<AnyFn>();

mock.module('./auditLog.model.js', {
  namedExports: {
    AuditLog: {
      find: mockAuditLogFind,
    },
  },
});

const { listAuditLog } = await import('./auditLog.controller.js');

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

function makeChain(entries: unknown[]) {
  return {
    sort: () => ({
      limit: () => Promise.resolve(entries),
    }),
  };
}

describe('listAuditLog', () => {
  beforeEach(() => mockAuditLogFind.mock.resetCalls());

  it('returns entries for a server', async () => {
    const entries = [{ action: 'mute' }, { action: 'kick' }];
    mockAuditLogFind.mock.mockImplementation(() => makeChain(entries));

    const res = makeRes();
    await listAuditLog(makeReq({ params: { serverId: 's1' }, query: {} }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { entries: unknown[] }).entries, entries);
  });

  it('applies before cursor filter', async () => {
    mockAuditLogFind.mock.mockImplementation(() => makeChain([]));

    const res = makeRes();
    await listAuditLog(makeReq({ params: { serverId: 's1' }, query: { before: 'abc123' } }), res);

    const filterArg = mockAuditLogFind.mock.calls[0]!.arguments[0] as Record<string, unknown>;
    assert.deepEqual(filterArg['_id'], { $lt: 'abc123' });
  });

  it('caps limit at 100', async () => {
    let capturedLimit = 0;
    mockAuditLogFind.mock.mockImplementation(() => ({
      sort: () => ({
        limit: (n: number) => { capturedLimit = n; return Promise.resolve([]); },
      }),
    }));

    const res = makeRes();
    await listAuditLog(makeReq({ params: { serverId: 's1' }, query: { limit: '999' } }), res);

    assert.equal(capturedLimit, 100);
  });

  it('defaults limit to 50', async () => {
    let capturedLimit = 0;
    mockAuditLogFind.mock.mockImplementation(() => ({
      sort: () => ({
        limit: (n: number) => { capturedLimit = n; return Promise.resolve([]); },
      }),
    }));

    const res = makeRes();
    await listAuditLog(makeReq({ params: { serverId: 's1' }, query: {} }), res);

    assert.equal(capturedLimit, 50);
  });

  it('returns empty array when no entries', async () => {
    mockAuditLogFind.mock.mockImplementation(() => makeChain([]));

    const res = makeRes();
    await listAuditLog(makeReq({ params: { serverId: 's1' }, query: {} }), res);

    assert.deepEqual((res._json as { entries: unknown[] }).entries, []);
  });
});
