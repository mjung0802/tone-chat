import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockSend = mock.fn<AnyFn>();
mock.module('../config/storage.js', {
  namedExports: { s3: { send: mockSend } },
});

mock.module('../config/index.js', {
  namedExports: {
    config: {
      s3: { bucket: 'test-bucket', endpoint: 'http://localhost:9000', region: 'us-east-1' },
    },
  },
});

mock.module('@aws-sdk/s3-request-presigner', {
  namedExports: { getSignedUrl: mock.fn<AnyFn>(async () => 'https://signed-url') },
});

const { uploadToS3, getFromS3, getPresignedUrl } = await import('./storage.service.js');

describe('uploadToS3', () => {
  beforeEach(() => mockSend.mock.resetCalls());

  it('calls s3.send with PutObjectCommand and returns storage key', async () => {
    mockSend.mock.mockImplementation(async () => ({}));
    const file = { buffer: Buffer.from('data'), mimetype: 'image/png', originalname: 'photo.png' };

    const key = await uploadToS3(file);

    assert.equal(mockSend.mock.callCount(), 1);
    // Key should be UUID format with .png extension
    assert.match(key, /^[0-9a-f-]+\.png$/);
    // Verify the command input
    const command = mockSend.mock.calls[0]!.arguments[0];
    assert.equal(command.input.Bucket, 'test-bucket');
    assert.equal(command.input.ContentType, 'image/png');
  });
});

describe('getFromS3', () => {
  beforeEach(() => mockSend.mock.resetCalls());

  it('calls s3.send with GetObjectCommand', async () => {
    const result = { Body: 'stream' };
    mockSend.mock.mockImplementation(async () => result);

    const response = await getFromS3('some-key.png');
    assert.equal(mockSend.mock.callCount(), 1);
    assert.equal(response, result);
    const command = mockSend.mock.calls[0]!.arguments[0];
    assert.equal(command.input.Bucket, 'test-bucket');
    assert.equal(command.input.Key, 'some-key.png');
  });
});

describe('getPresignedUrl', () => {
  it('returns a presigned URL', async () => {
    const url = await getPresignedUrl('abc-123.jpg');
    assert.equal(url, 'https://signed-url');
  });
});
