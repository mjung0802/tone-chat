import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const mockSql = mock.fn<AnyFn>(() => []);

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, 'object');
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

mock.module('../config/database.js', { namedExports: { sql: mockSql } });

mock.module('../config/index.js', {
  namedExports: {
    config: {
      storageProvider: 'local',
      local: { storagePath: '/tmp/test-attachments', publicBaseUrl: 'http://localhost:4000/api/v1', urlSigningSecret: 'test-secret' },
    },
  },
});

const mockUploadToStorage = mock.fn<AnyFn>();
const mockGetStorageUrl = mock.fn<AnyFn>();
const mockDeleteFromStorage = mock.fn<AnyFn>();
const mockVerifyLocalDownloadToken = mock.fn<AnyFn>();
mock.module('./storage.service.js', {
  namedExports: {
    uploadToStorage: mockUploadToStorage,
    getStorageUrl: mockGetStorageUrl,
    deleteFromStorage: mockDeleteFromStorage,
    verifyLocalDownloadToken: mockVerifyLocalDownloadToken,
  },
});

const { createAttachment, getAttachment, deleteAttachment, getPublicLocalAttachment } = await import('./attachments.service.js');

describe('createAttachment', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockUploadToStorage.mock.resetCalls();
    mockGetStorageUrl.mock.resetCalls();
  });

  it('throws FILE_TOO_LARGE over 25MB', async () => {
    const file = { buffer: Buffer.alloc(0), mimetype: 'image/png', originalname: 'big.png', size: 26 * 1024 * 1024 };
    await assert.rejects(() => createAttachment('u1', file), (error) => assertErrorCode(error, 'FILE_TOO_LARGE'));
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
    mockUploadToStorage.mock.mockImplementation(async () => 'uuid-key.png');
    mockGetStorageUrl.mock.mockImplementation(async () => 'http://cdn/key.png');

    const file = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'pic.png', size: 1000 };
    const result = await createAttachment('u1', file);

    assert.equal(result.status, 'ready');
    assert.equal(mockUploadToStorage.mock.callCount(), 1);
    assert.equal(mockGetStorageUrl.mock.callCount(), 1);
  });

  it('updates to failed on S3 error and re-throws', async () => {
    const attachment = { id: 'a1', status: 'processing' };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // INSERT
      return []; // UPDATE to failed
    });
    mockUploadToStorage.mock.mockImplementation(async () => { throw new Error('S3 down'); });

    const file = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'pic.png', size: 1000 };
    await assert.rejects(() => createAttachment('u1', file), (error) => {
      assert.equal((error as { message?: unknown }).message, 'S3 down');
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
    await assert.rejects(() => getAttachment('a1'), (error) => assertErrorCode(error, 'ATTACHMENT_NOT_FOUND'));
  });

  it('returns attachment with fresh presigned URL when ready', async () => {
    const attachment = { id: 'a1', status: 'ready', storage_key: 'key.png', url: 'old-url' };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetStorageUrl.mock.mockImplementation(async () => 'https://fresh-signed-url');
    const result = await getAttachment('a1');
    assert.equal(result.url, 'https://fresh-signed-url');
    assert.equal(mockGetStorageUrl.mock.callCount(), 1);
  });

  it('does not generate presigned URL for non-ready attachment', async () => {
    const attachment = { id: 'a1', status: 'processing', storage_key: 'pending', url: null };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetStorageUrl.mock.resetCalls();
    const result = await getAttachment('a1');
    assert.equal(result.url, null);
    assert.equal(mockGetStorageUrl.mock.callCount(), 0);
  });

  it('does not generate presigned URL when storage_key is pending', async () => {
    const attachment = { id: 'a1', status: 'ready', storage_key: 'pending', url: 'old-url' };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetStorageUrl.mock.resetCalls();
    const result = await getAttachment('a1');
    assert.equal(result.url, 'old-url');
    assert.equal(mockGetStorageUrl.mock.callCount(), 0);
  });

  it('does not generate presigned URL when storage_key is null', async () => {
    const attachment = { id: 'a1', status: 'ready', storage_key: null, url: null };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetStorageUrl.mock.resetCalls();
    const result = await getAttachment('a1');
    assert.equal(result.url, null);
    assert.equal(mockGetStorageUrl.mock.callCount(), 0);
  });
});

describe('deleteAttachment', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockDeleteFromStorage.mock.resetCalls();
  });

  it('throws ATTACHMENT_NOT_FOUND when attachment does not exist', async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(() => deleteAttachment('a1', 'u1'), (error) => assertErrorCode(error, 'ATTACHMENT_NOT_FOUND'));
  });

  it('throws FORBIDDEN when requester is not the uploader', async () => {
    const attachment = { id: 'a1', uploader_id: 'u1', status: 'ready', storage_key: 'key.png' };
    mockSql.mock.mockImplementation(() => [attachment]);
    await assert.rejects(() => deleteAttachment('a1', 'u2'), (error) => assertErrorCode(error, 'FORBIDDEN'));
  });

  it('deletes from S3 and database when attachment is ready', async () => {
    const attachment = { id: 'a1', uploader_id: 'u1', status: 'ready', storage_key: 'key.png' };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // SELECT
      return []; // DELETE
    });
    mockDeleteFromStorage.mock.mockImplementation(async () => undefined);

    await deleteAttachment('a1', 'u1');

    assert.equal(mockDeleteFromStorage.mock.callCount(), 1);
    assert.equal(mockDeleteFromStorage.mock.calls[0]?.arguments[0], 'key.png');
    assert.equal(callCount, 2); // SELECT + DELETE
  });

  it('does not call deleteFromS3 when storage_key is pending', async () => {
    const attachment = { id: 'a1', uploader_id: 'u1', status: 'processing', storage_key: 'pending' };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // SELECT
      return []; // DELETE
    });
    mockDeleteFromStorage.mock.resetCalls();

    await deleteAttachment('a1', 'u1');

    assert.equal(mockDeleteFromStorage.mock.callCount(), 0);
    assert.equal(callCount, 2); // SELECT + DELETE
  });

  it('does not call deleteFromS3 when status is failed', async () => {
    const attachment = { id: 'a1', uploader_id: 'u1', status: 'failed', storage_key: 'key.png' };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // SELECT
      return []; // DELETE
    });
    mockDeleteFromStorage.mock.resetCalls();

    await deleteAttachment('a1', 'u1');

    assert.equal(mockDeleteFromStorage.mock.callCount(), 0);
    assert.equal(callCount, 2); // SELECT + DELETE
  });
});

describe('getPublicLocalAttachment', () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockVerifyLocalDownloadToken.mock.resetCalls();
  });

  it('throws ATTACHMENT_NOT_FOUND for invalid token', async () => {
    mockVerifyLocalDownloadToken.mock.mockImplementation(() => null);
    await assert.rejects(() => getPublicLocalAttachment('bad-token'), (error) => assertErrorCode(error, 'ATTACHMENT_NOT_FOUND'));
  });

  it('returns local attachment metadata for valid token', async () => {
    mockVerifyLocalDownloadToken.mock.mockImplementation(() => 'a1');
    mockSql.mock.mockImplementation(() => [{ storage_key: 'key.png', mime_type: 'image/png', filename: 'pic.png' }]);

    const result = await getPublicLocalAttachment('good-token');
    assert.equal(result.storage_key, 'key.png');
    assert.equal(result.mime_type, 'image/png');
  });
});
