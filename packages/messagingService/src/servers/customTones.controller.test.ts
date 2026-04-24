import type { Request, Response } from 'express';
import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

type RequestOverrides = Partial<Pick<Request, 'body' | 'params' | 'headers'>> & { userId?: string };
type TestResponse = Response & { statusCode: number; _json: unknown };

const mockServerFindById = mock.fn<AnyFn>();
const mockServerUpdateOne = mock.fn<AnyFn>();
const mockServerExists = mock.fn<AnyFn>();

mock.module('./server.model.js', {
  namedExports: {
    Server: {
      findById: mockServerFindById,
      updateOne: mockServerUpdateOne,
      exists: mockServerExists,
    },
  },
});

const { listCustomTones, addCustomTone, removeCustomTone } = await import('./customTones.controller.js');

function makeReq(overrides: RequestOverrides = {}): Request {
  return { body: {}, params: {}, headers: {}, userId: 'u1', ...overrides } as Request;
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

// findById returns a Query-like object whose .lean() resolves to the doc/null.
function mockFindByIdOnce(doc: unknown): void {
  mockServerFindById.mock.mockImplementationOnce(() => ({
    lean: async () => doc,
  }));
}

function resetAllMocks(): void {
  mockServerFindById.mock.resetCalls();
  mockServerUpdateOne.mock.resetCalls();
  mockServerExists.mock.resetCalls();
}

describe('listCustomTones', () => {
  beforeEach(resetAllMocks);

  it('returns customTones from server', async () => {
    const tones = [{ key: 'fun', label: 'Fun', emoji: '🎉', colorLight: '#FF0000', colorDark: '#880000', textStyle: 'normal' }];
    mockFindByIdOnce({ customTones: tones });

    const req = makeReq({ params: { serverId: 's1' } });
    const res = makeRes();
    await listCustomTones(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { customTones: unknown }).customTones, tones);
  });

  it('returns empty array when no custom tones', async () => {
    mockFindByIdOnce({ customTones: [] });

    const req = makeReq({ params: { serverId: 's1' } });
    const res = makeRes();
    await listCustomTones(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { customTones: unknown }).customTones, []);
  });

  it('returns 404 when server not found', async () => {
    mockFindByIdOnce(null);

    const req = makeReq({ params: { serverId: 'bad' } });
    const res = makeRes();
    await listCustomTones(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal((res._json as { error: { code: string } }).error.code, 'SERVER_NOT_FOUND');
  });
});

describe('addCustomTone', () => {
  beforeEach(resetAllMocks);

  it('returns 201 with valid data via atomic updateOne', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 1, modifiedCount: 1 }));

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody() });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 201);
    const result = res._json as { customTone: { key: string } };
    assert.equal(result.customTone.key, 'chill');
    assert.equal(mockServerUpdateOne.mock.callCount(), 1);

    // Verify the query guards against duplicates and max tones
    const [filter, update] = mockServerUpdateOne.mock.calls[0]!.arguments as [Record<string, unknown>, Record<string, unknown>];
    assert.equal(filter['_id'], 's1');
    assert.deepEqual(filter['customTones.key'], { $ne: 'chill' });
    assert.ok('$expr' in filter);
    assert.ok('$push' in update);
  });

  it('returns 400 for missing key (no DB call)', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: undefined }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
    assert.equal(mockServerUpdateOne.mock.callCount(), 0);
  });

  it('returns 400 for key with invalid pattern', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: 'UPPER_CASE!' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for key exceeding 10 chars', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: 'abcdefghijk' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for invalid hex color', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ colorLight: 'notacolor' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 409 for duplicate key (updateOne no-match → findById reveals duplicate)', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, modifiedCount: 0 }));
    mockFindByIdOnce({
      customTones: [{ key: 'chill', label: 'Chill', emoji: '😎', colorLight: '#AABBCC', colorDark: '#112233', textStyle: 'normal' }],
    });

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody() });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal((res._json as { error: { code: string } }).error.code, 'DUPLICATE_TONE_KEY');
  });

  it('returns 400 when server has 20 custom tones (updateOne no-match → findById shows capacity)', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, modifiedCount: 0 }));
    const tones = Array.from({ length: 20 }, (_, i) => ({
      key: `tone${i}`, label: `Tone ${i}`, emoji: '🎵', colorLight: '#AABBCC', colorDark: '#112233', textStyle: 'normal' as const,
    }));
    mockFindByIdOnce({ customTones: tones });

    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ key: 'new1' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'MAX_CUSTOM_TONES');
  });

  it('returns 404 when updateOne misses and server is not found', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, modifiedCount: 0 }));
    mockFindByIdOnce(null);

    const req = makeReq({ params: { serverId: 'missing' }, body: validToneBody() });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal((res._json as { error: { code: string } }).error.code, 'SERVER_NOT_FOUND');
  });

  it('returns 201 with all 4 new animation fields provided as valid', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 1, modifiedCount: 1 }));

    const req = makeReq({
      params: { serverId: 's1' },
      body: validToneBody({
        char: 'bounce',
        emojiSet: ['✨', '🌟'],
        driftDir: 'UR',
        matchEmojis: ['😊', '😄'],
      }),
    });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 201);
    const result = res._json as { customTone: { char: string; emojiSet: string[]; driftDir: string; matchEmojis: string[] } };
    assert.equal(result.customTone.char, 'bounce');
    assert.deepEqual(result.customTone.emojiSet, ['✨', '🌟']);
    assert.equal(result.customTone.driftDir, 'UR');
    assert.deepEqual(result.customTone.matchEmojis, ['😊', '😄']);
  });

  it('returns 400 for char with invalid enum value', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ char: 'spin' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for driftDir with invalid value', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ driftDir: 'DOWN' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for emojiSet not an array', async () => {
    const req = makeReq({ params: { serverId: 's1' }, body: validToneBody({ emojiSet: '✨' }) });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for emojiSet exceeding 8 items', async () => {
    const req = makeReq({
      params: { serverId: 's1' },
      body: validToneBody({ emojiSet: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] }),
    });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });

  it('returns 400 for matchEmojis exceeding 20 items', async () => {
    const req = makeReq({
      params: { serverId: 's1' },
      body: validToneBody({ matchEmojis: Array.from({ length: 21 }, (_, i) => `e${i}`) }),
    });
    const res = makeRes();
    await addCustomTone(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal((res._json as { error: { code: string } }).error.code, 'INVALID_TONE');
  });
});

describe('removeCustomTone', () => {
  beforeEach(resetAllMocks);

  it('removes tone by key via atomic $pull and returns 204', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 1, modifiedCount: 1 }));

    const req = makeReq({ params: { serverId: 's1', toneKey: 'chill' } });
    const res = makeRes();
    await removeCustomTone(req, res);

    assert.equal(res.statusCode, 204);
    assert.equal(mockServerUpdateOne.mock.callCount(), 1);
    const [filter, update] = mockServerUpdateOne.mock.calls[0]!.arguments as [Record<string, unknown>, Record<string, unknown>];
    assert.equal(filter['_id'], 's1');
    assert.equal(filter['customTones.key'], 'chill');
    assert.deepEqual(update['$pull'], { customTones: { key: 'chill' } });
  });

  it('returns 404 TONE_NOT_FOUND when server exists but tone key missing', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, modifiedCount: 0 }));
    mockServerExists.mock.mockImplementationOnce(async () => ({ _id: 's1' }));

    const req = makeReq({ params: { serverId: 's1', toneKey: 'nope' } });
    const res = makeRes();
    await removeCustomTone(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal((res._json as { error: { code: string } }).error.code, 'TONE_NOT_FOUND');
  });

  it('returns 404 SERVER_NOT_FOUND when server itself is missing', async () => {
    mockServerUpdateOne.mock.mockImplementationOnce(async () => ({ matchedCount: 0, modifiedCount: 0 }));
    mockServerExists.mock.mockImplementationOnce(async () => null);

    const req = makeReq({ params: { serverId: 'missing', toneKey: 'whatever' } });
    const res = makeRes();
    await removeCustomTone(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal((res._json as { error: { code: string } }).error.code, 'SERVER_NOT_FOUND');
  });
});
