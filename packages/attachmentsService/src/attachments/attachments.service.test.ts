import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockSql: any = mock.fn<AnyFn>((..._args: unknown[]) => []);

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

const mockUploadToS3 = mock.fn<AnyFn>();
const mockGetPublicUrl = mock.fn<AnyFn>();
mock.module('./storage.service.js', {
  namedExports: { uploadToS3: mockUploadToS3, getPublicUrl: mockGetPublicUrl },
});

const { createAttachment, getAttachment } = await import('./attachments.service.js');

describe('createAttachment', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockUploadToS3.mock.resetCalls();
    mockGetPublicUrl.mock.resetCalls();
  });

  it('throws FILE_TOO_LARGE over 25MB', async () => {
    const file = { buffer: Buffer.alloc(0), mimetype: 'image/png', originalname: 'big.png', size: 26 * 1024 * 1024 };
    await assert.rejects(() => createAttachment('u1', file), (err: any) => {
      assert.equal(err.code, 'FILE_TOO_LARGE');
      return true;
    });
  });

  it('inserts with processing status then updates to ready on success', async () => {
    const attachment = { id: 'a1', status: 'processing' };
    const updated = { id: 'a1', status: 'ready', url: 'http://cdn/key.png' };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // INSERT
      return [updated]; // UPDATE to ready
    });
    mockUploadToS3.mock.mockImplementation(async () => 'uuid-key.png');
    mockGetPublicUrl.mock.mockImplementation(() => 'http://cdn/key.png');

    const file = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'pic.png', size: 1000 };
    const result = await createAttachment('u1', file);

    assert.equal(result.status, 'ready');
    assert.equal(mockUploadToS3.mock.callCount(), 1);
    assert.equal(mockGetPublicUrl.mock.callCount(), 1);
  });

  it('updates to failed on S3 error and re-throws', async () => {
    const attachment = { id: 'a1', status: 'processing' };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // INSERT
      return []; // UPDATE to failed
    });
    mockUploadToS3.mock.mockImplementation(async () => { throw new Error('S3 down'); });

    const file = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'pic.png', size: 1000 };
    await assert.rejects(() => createAttachment('u1', file), (err: any) => {
      assert.equal(err.message, 'S3 down');
      return true;
    });
    // Should have called sql twice: INSERT + UPDATE to failed
    assert.ok(callCount >= 2);
  });
});

describe('getAttachment', () => {
  beforeEach(() => mockSql.mock.resetCalls());

  it('throws ATTACHMENT_NOT_FOUND on empty result', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => getAttachment('a1'), (err: any) => {
      assert.equal(err.code, 'ATTACHMENT_NOT_FOUND');
      return true;
    });
  });

  it('returns attachment on success', async () => {
    const attachment = { id: 'a1', status: 'ready' };
    mockSql.mock.mockImplementation(() => [attachment]);
    const result = await getAttachment('a1');
    assert.deepEqual(result, attachment);
  });
});
