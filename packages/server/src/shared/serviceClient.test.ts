import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

const mockWarn = mock.fn<AnyFn>();

mock.module('./logger.js', {
  namedExports: { logger: { warn: mockWarn, info: mock.fn<AnyFn>(), error: mock.fn<AnyFn>() } },
});

mock.module('../config/index.js', {
  namedExports: { config: { internalApiKey: 'test-key' } },
});

const { serviceRequest } = await import('./serviceClient.js');

describe('serviceRequest', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof mock.fn>;

  beforeEach(() => {
    mockFetch = mock.fn<AnyFn>();
    // @ts-expect-error - Intentionally replacing global fetch with mock for testing
    globalThis.fetch = mockFetch;
    mockWarn.mock.resetCalls();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('injects X-Internal-Key header', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => ({}) }));
    await serviceRequest('http://svc', '/path');
    const call = mockFetch.mock.calls[0]!;
    const init = call.arguments[1] as RequestInit;
    assert.equal((init.headers as Record<string, string>)['X-Internal-Key'], 'test-key');
  });

  it('injects X-User-Token when userToken option provided', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => ({}) }));
    await serviceRequest('http://svc', '/path', { userToken: 'tok1' });
    const init = mockFetch.mock.calls[0]!.arguments[1] as RequestInit;
    assert.equal((init.headers as Record<string, string>)['X-User-Token'], 'tok1');
  });

  it('sends JSON-stringified body', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => ({}) }));
    await serviceRequest('http://svc', '/path', { method: 'POST', body: { foo: 'bar' } });
    const init = mockFetch.mock.calls[0]!.arguments[1] as RequestInit;
    assert.equal(init.body, JSON.stringify({ foo: 'bar' }));
  });

  it('sends null body when no body provided', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => ({}) }));
    await serviceRequest('http://svc', '/path');
    const init = mockFetch.mock.calls[0]!.arguments[1] as RequestInit;
    assert.equal(init.body, null);
  });

  it('defaults to GET method', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => ({}) }));
    await serviceRequest('http://svc', '/path');
    const init = mockFetch.mock.calls[0]!.arguments[1] as RequestInit;
    assert.equal(init.method, 'GET');
  });

  it('returns { status: 204, data: null } on 204', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 204 }));
    const result = await serviceRequest('http://svc', '/path');
    assert.deepEqual(result, { status: 204, data: null });
  });

  it('parses and returns JSON for non-204 responses', async () => {
    const payload = { id: 1, name: 'test' };
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => payload }));
    const result = await serviceRequest('http://svc', '/path');
    assert.deepEqual(result, { status: 200, data: payload });
  });

  it('returns status and null data when JSON parsing fails', async () => {
    mockFetch.mock.mockImplementation(async () => ({
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    }));
    const result = await serviceRequest('http://svc', '/path');
    assert.deepEqual(result, { status: 502, data: null });
  });

  it('logs a warning when JSON parsing fails', async () => {
    mockFetch.mock.mockImplementation(async () => ({
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    }));
    await serviceRequest('http://svc', '/path');
    assert.equal(mockWarn.mock.callCount(), 1);
    const args = mockWarn.mock.calls[0]!.arguments;
    assert.ok(typeof args[0] === 'object' && args[0] !== null, 'first arg should be context object');
    assert.equal(args[1], 'Failed to parse JSON response from downstream service');
  });
});
