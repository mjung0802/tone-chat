import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { app } from '../app.js';

let server: HttpServer;
let baseUrl: string;

before(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
});

describe('GET /api/v1/health', () => {
  it('returns 200 with ok:true without any auth', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as { ok: boolean; version: string };
    assert.equal(body.ok, true);
    assert.equal(typeof body.version, 'string');
  });
});
