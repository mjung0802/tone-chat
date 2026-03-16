import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

const mockSql = mock.fn<AnyFn>(() => []);

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, "object");
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

mock.module("../config/database.js", { namedExports: { sql: mockSql } });

const mockUploadToS3 = mock.fn<AnyFn>();
const mockGetPresignedUrl = mock.fn<AnyFn>();
mock.module("./storage.service.js", {
  namedExports: {
    uploadToS3: mockUploadToS3,
    getPresignedUrl: mockGetPresignedUrl,
  },
});

const { createAttachment, getAttachment } =
  await import("./attachments.service.js");

describe("createAttachment", () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockUploadToS3.mock.resetCalls();
    mockGetPresignedUrl.mock.resetCalls();
  });

  it("throws FILE_TOO_LARGE over 25MB", async () => {
    const file = {
      buffer: Buffer.alloc(0),
      mimetype: "image/png",
      originalname: "big.png",
      size: 26 * 1024 * 1024,
    };
    await assert.rejects(
      () => createAttachment("u1", file),
      (error) => assertErrorCode(error, "FILE_TOO_LARGE"),
    );
  });

  it("inserts with processing status then updates to ready on success", async () => {
    const attachment = { id: "a1", status: "processing" };
    const updated = { id: "a1", status: "ready", url: "http://cdn/key.png" };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // INSERT
      return [updated]; // UPDATE to ready
    });
    mockUploadToS3.mock.mockImplementation(async () => "uuid-key.png");
    mockGetPresignedUrl.mock.mockImplementation(
      async () => "http://cdn/key.png",
    );

    const file = {
      buffer: Buffer.from("data"),
      mimetype: "image/png",
      originalname: "pic.png",
      size: 1000,
    };
    const result = await createAttachment("u1", file);

    assert.equal(result.status, "ready");
    assert.equal(mockUploadToS3.mock.callCount(), 1);
    assert.equal(mockGetPresignedUrl.mock.callCount(), 1);
  });

  it("updates to failed on S3 error and re-throws", async () => {
    const attachment = { id: "a1", status: "processing" };
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [attachment]; // INSERT
      return []; // UPDATE to failed
    });
    mockUploadToS3.mock.mockImplementation(async () => {
      throw new Error("S3 down");
    });

    const file = {
      buffer: Buffer.from("data"),
      mimetype: "image/png",
      originalname: "pic.png",
      size: 1000,
    };
    await assert.rejects(
      () => createAttachment("u1", file),
      (error) => {
        assert.equal((error as { message?: unknown }).message, "S3 down");
        return true;
      },
    );
    // Should have called sql twice: INSERT + UPDATE to failed
    assert.ok(callCount >= 2);
  });
});

describe("getAttachment", () => {
  beforeEach(() => mockSql.mock.resetCalls());

  it("throws ATTACHMENT_NOT_FOUND on empty result", async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(
      () => getAttachment("a1"),
      (error) => assertErrorCode(error, "ATTACHMENT_NOT_FOUND"),
    );
  });

  it("returns attachment with fresh presigned URL when ready", async () => {
    const attachment = {
      id: "a1",
      status: "ready",
      storage_key: "key.png",
      url: "old-url",
    };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetPresignedUrl.mock.mockImplementation(
      async () => "https://fresh-signed-url",
    );
    const result = await getAttachment("a1");
    assert.equal(result.url, "https://fresh-signed-url");
    assert.equal(mockGetPresignedUrl.mock.callCount(), 1);
  });

  it("does not generate presigned URL for non-ready attachment", async () => {
    const attachment = {
      id: "a1",
      status: "processing",
      storage_key: "pending",
      url: null,
    };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetPresignedUrl.mock.resetCalls();
    const result = await getAttachment("a1");
    assert.equal(result.url, null);
    assert.equal(mockGetPresignedUrl.mock.callCount(), 0);
  });

  it("does not generate presigned URL when storage_key is pending", async () => {
    const attachment = {
      id: "a1",
      status: "ready",
      storage_key: "pending",
      url: "old-url",
    };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetPresignedUrl.mock.resetCalls();
    const result = await getAttachment("a1");
    assert.equal(result.url, "old-url");
    assert.equal(mockGetPresignedUrl.mock.callCount(), 0);
  });

  it("does not generate presigned URL when storage_key is null", async () => {
    const attachment = {
      id: "a1",
      status: "ready",
      storage_key: null,
      url: null,
    };
    mockSql.mock.mockImplementation(() => [attachment]);
    mockGetPresignedUrl.mock.resetCalls();
    const result = await getAttachment("a1");
    assert.equal(result.url, null);
    assert.equal(mockGetPresignedUrl.mock.callCount(), 0);
  });
});
