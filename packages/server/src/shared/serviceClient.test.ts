import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

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

  it('injects X-User-Id when userId option provided', async () => {
    mockFetch.mock.mockImplementation(async () => ({ status: 200, json: async () => ({}) }));
    await serviceRequest('http://svc', '/path', { userId: 'u1' });
    const init = mockFetch.mock.calls[0]!.arguments[1] as RequestInit;
    assert.equal((init.headers as Record<string, string>)['X-User-Id'], 'u1');
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
});
