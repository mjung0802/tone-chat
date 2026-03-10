import { before, after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app } from '../app.js';
import { sql } from '../config/database.js';
import { ensureBucket } from '../config/storage.js';

let server: Server;
let baseUrl: string;
const HEADERS = { 'x-internal-key': 'dev-internal-key' };

before(async () => {
  await ensureBucket();
  server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

after(async () => {
  server.close();
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE attachments CASCADE`;
});

describe('POST /attachments/upload', () => {
  it('uploads a file and returns metadata with status and URL', async () => {
    const fileContent = Buffer.from('hello world');
    const formData = new FormData();
    formData.append('file', new Blob([fileContent], { type: 'text/plain' }), 'test.txt');

    const res = await fetch(`${baseUrl}/attachments/upload`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': '00000000-0000-0000-0000-000000000001' },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = await res.json() as {
      attachment: {
        id: string;
        filename: string;
        mime_type: string;
        size_bytes: number;
        status: string;
        url: string;
        uploader_id: string;
      };
    };
    assert.equal(body.attachment.filename, 'test.txt');
    assert.equal(body.attachment.mime_type, 'text/plain');
    assert.equal(body.attachment.status, 'ready');
    assert.ok(body.attachment.url);
    assert.equal(body.attachment.uploader_id, '00000000-0000-0000-0000-000000000001');

    // Verify persistence in PG
    const [row] = await sql<{ id: string; status: string }[]>`
      SELECT id, status FROM attachments WHERE id = ${body.attachment.id}
    `;
    assert.ok(row);
    assert.equal(row.status, 'ready');
  });

  it('uploads an image file', async () => {
    // 1x1 red PNG
    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64',
    );
    const formData = new FormData();
    formData.append('file', new Blob([pngBytes], { type: 'image/png' }), 'pixel.png');

    const res = await fetch(`${baseUrl}/attachments/upload`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': '00000000-0000-0000-0000-000000000001' },
      body: formData,
    });

    assert.equal(res.status, 201);
    const body = await res.json() as { attachment: { mime_type: string; filename: string } };
    assert.equal(body.attachment.mime_type, 'image/png');
    assert.equal(body.attachment.filename, 'pixel.png');
  });

  it('returns 400 when no file is provided', async () => {
    const res = await fetch(`${baseUrl}/attachments/upload`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': '00000000-0000-0000-0000-000000000001' },
    });

    assert.equal(res.status, 400);
  });
});

describe('GET /attachments/:id', () => {
  it('returns attachment metadata with presigned URL', async () => {
    // Upload first
    const formData = new FormData();
    formData.append('file', new Blob([Buffer.from('data')], { type: 'text/plain' }), 'doc.txt');

    const uploadRes = await fetch(`${baseUrl}/attachments/upload`, {
      method: 'POST',
      headers: { ...HEADERS, 'x-user-id': '00000000-0000-0000-0000-000000000001' },
      body: formData,
    });
    const { attachment } = await uploadRes.json() as { attachment: { id: string; url: string } };

    // Retrieve — should regenerate presigned URL
    const res = await fetch(`${baseUrl}/attachments/${attachment.id}`, {
      headers: HEADERS,
    });

    assert.equal(res.status, 200);
    const body = await res.json() as { attachment: { id: string; filename: string; status: string; url: string } };
    assert.equal(body.attachment.id, attachment.id);
    assert.equal(body.attachment.filename, 'doc.txt');
    assert.equal(body.attachment.status, 'ready');
    assert.ok(body.attachment.url, 'presigned URL should be present');
    assert.equal(typeof body.attachment.url, 'string');
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await fetch(`${baseUrl}/attachments/00000000-0000-0000-0000-000000000000`, {
      headers: HEADERS,
    });

    assert.equal(res.status, 404);
  });
});

describe('internalAuth middleware', () => {
  it('returns 401 for wrong x-internal-key', async () => {
    const res = await fetch(`${baseUrl}/attachments/00000000-0000-0000-0000-000000000000`, {
      headers: { 'x-internal-key': 'wrong-key' },
    });
    assert.equal(res.status, 401);
    const body = await res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'UNAUTHORIZED');
  });
});
