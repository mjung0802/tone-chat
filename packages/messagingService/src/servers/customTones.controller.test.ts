import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers'>>;
type TestResponse = Response & { statusCode: number; _json: unknown };

const mockServerFindById = mock.fn<AnyFn>();
mock.module('./server.model.js', {
  namedExports: {
    Server: {
      findById: mockServerFindById,
    },
  },
});

const { listCustomTones, addCustomTone, removeCustomTone } = await import('./customTones.controller.js');

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: { 'x-user-id': 'u1' }, ...overrides } as Request;
}

function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  res.end = () => res;
  return res;
}

function validToneBody(overrides: Record<string, unknown> = {}) {
  return {
    key: 'chill',
    label: 'Chill',
    emoji: '😎',
    colorLight: '#AABBCC',
    colorDark: '#112233',
    ...overrides,
  };
}

describe('listCustomTones', () => {
  beforeEach(() => mockServerFindById.mock.resetCalls());

  it('returns customTones from server', async () => {
    const tones = [{ key: 'fun', label: 'Fun', emoji: '🎉', colorLight: '#FF0000', colorDark: '#880000', textStyle: 'normal' }];
    mockServerFindById.mock.mockImplementation(async () => ({ customTones: tones }));

    const req = makeReq({ params: { serverId: 's1' } });
    const res = makeRes();
    await listCustomTones(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { customTones: unknown }).customTones, tones);
  });

  it('returns empty array when no custom tones', async () => {
    mockServerFindById.mock.mockImplementation(async () => ({ customTones: [] }));

    const req = makeReq({ params: { serverId: 's1' } });
    const res = makeRes();
    await listCustomTones(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { customTones: unknown }).customTones, []);
  });

  it('returns 404 when server not found', async () => {
    mockServerFindById.mock.mockImplementation(async () => null);

    const req = makeReq({ params: { serverId: 'bad' } });
    const res = makeRes();
    await listCustomTones(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal((res._json as { error: { code: string } }).error.code, 'SERVER_NOT_FOUND');
  });
});

describe('addCustomTone', () => {
  beforeEach(() => mockServerFindById.mock.resetCalls());

  it('returns 201 with valid data', async () => {
    const mockSave = mock.fn(async () => {});
    const server = { customTones: [] as unknown[], save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody() });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 201);
    const result = res._json as { customTone: { key: string } };
    assert.equal(result.customTone.key, 'chill');
    assert.equal(mockSave.mock.callCount(), 1);
    assert.equal(server.customTones.length, 1);
  });

  it('returns 400 for missing key', async () => {
    const mockSave = mock.fn(async () => {});
    const server = { customTones: [] as unknown[], save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: undefined }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for key with invalid pattern', async () => {
    const mockSave = mock.fn(async () => {});
    const server = { customTones: [] as unknown[], save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: 'UPPER_CASE!' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for key exceeding 10 chars', async () => {
    const mockSave = mock.fn(async () => {});
    const server = { customTones: [] as unknown[], save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: 'abcdefghijk' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for invalid hex color', async () => {
    const mockSave = mock.fn(async () => {});
    const server = { customTones: [] as unknown[], save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ colorLight: 'notacolor' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 409 for duplicate key', async () => {
    const mockSave = mock.fn(async () => {});
    const server = {
      customTones: [{ key: 'chill', label: 'Chill', emoji: '😎', colorLight: '#AABBCC', colorDark: '#112233', textStyle: 'normal' }],
      save: mockSave,
    };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody() });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal((res._json as { error: { code: string } }).error.code, 'DUPLICATE_TONE_KEY');
  });

  it('returns 400 when server has 20 custom tones', async () => {
    const mockSave = mock.fn(async () => {});
    const tones = Array.from({ length: 20 }, (_, i) => ({
      key: `tone${i}`, label: `Tone ${i}`, emoji: '🎵', colorLight: '#AABBCC', colorDark: '#112233', textStyle: 'normal' as const,
    }));
    const server = { customTones: tones, save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: 'new1' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MAX_CUSTOM_TONES');
  });
});

describe('removeCustomTone', () => {
  beforeEach(() => mockServerFindById.mock.resetCalls());

  it('removes tone by key and returns 204', async () => {
    const mockSave = mock.fn(async () => {});
    const server = {
      customTones: [{ key: 'chill', label: 'Chill', emoji: '😎', colorLight: '#AABBCC', colorDark: '#112233', textStyle: 'normal' }],
      save: mockSave,
    };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1', toneKey: 'chill' } });
    const res = makeRes();
    await removeCustomTone(req, res);

    assert.equal(res.statusCode, 204);
    assert.equal(server.customTones.length, 0);
    assert.equal(mockSave.mock.callCount(), 1);
  });

  it('returns 404 when key not found', async () => {
    const mockSave = mock.fn(async () => {});
    const server = { customTones: [], save: mockSave };
    mockServerFindById.mock.mockImplementation(async () => server);

    const req = makeReq({ params: { serverId: 's1', toneKey: 'nope' } });
    const res = makeRes();
    await removeCustomTone(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal((res._json as { error: { code: string } }).error.code, 'TONE_NOT_FOUND');
  });
});
