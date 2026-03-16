import assert from "node:assert/strict";
import realCrypto from "node:crypto";
import { beforeEach, describe, it, mock } from "node:test";

type SqlMockFn = (...args: unknown[]) => unknown[];

function assertErrorWithCodeAndStatus(
  error: unknown,
  code: string,
  status: number,
): true {
  assert.equal(typeof error, "object");
  assert.notEqual(error, null);
  const typed = error as { code?: unknown; status?: unknown };
  assert.equal(typed.code, code);
  assert.equal(typed.status, status);
  return true;
}

const mockSql = mock.fn<SqlMockFn>((..._args) => {
  void _args;
  return [];
});
mock.module("../config/database.js", { namedExports: { sql: mockSql } });

const mockSendVerificationEmail = mock.fn<AnyFn>();
mock.module("../email/email.service.js", {
  namedExports: { sendVerificationEmail: mockSendVerificationEmail },
});

const mockRandomInt = mock.fn<AnyFn>(() => 42);
mock.module("node:crypto", {
  defaultExport: {
    createHash: (alg: string) => realCrypto.createHash(alg),
    randomInt: mockRandomInt,
  },
});

const { sendVerificationOtp, verifyOtp } =
  await import("./verification.service.js");

describe("sendVerificationOtp", () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockSendVerificationEmail.mock.resetCalls();
    mockRandomInt.mock.resetCalls();
    mockRandomInt.mock.mockImplementation(() => 42);
    mockSendVerificationEmail.mock.mockImplementation(async () => {});
  });

  it("deletes existing tokens before inserting new one", async () => {
    await sendVerificationOtp("user-1", "user@test.com");

    assert.ok(mockSql.mock.callCount() >= 2);
    const firstCall = mockSql.mock.calls[0]!;
    const sqlStrings = firstCall.arguments[0] as string[];
    assert.ok(
      (sqlStrings[0] ?? "").trim().startsWith("DELETE"),
      "first SQL call should be DELETE",
    );
  });

  it("generates a 6-digit zero-padded code when randomInt returns 5", async () => {
    mockRandomInt.mock.mockImplementation(() => 5);

    await sendVerificationOtp("user-1", "user@test.com");

    assert.equal(
      mockSendVerificationEmail.mock.calls[0]!.arguments[1],
      "000005",
    );
  });

  it("stores SHA-256 hash (not plaintext code) in DB", async () => {
    mockRandomInt.mock.mockImplementation(() => 5);

    await sendVerificationOtp("user-1", "user@test.com");

    // INSERT is the second SQL call; codeHash is the third argument (index 2)
    const insertCall = mockSql.mock.calls[1]!;
    const codeHash = insertCall.arguments[2] as string;
    assert.match(codeHash, /^[0-9a-f]{64}$/);
    assert.notEqual(codeHash, "000005");
  });

  it("sets expires_at ~15 minutes in the future", async () => {
    const before = Date.now();

    await sendVerificationOtp("user-1", "user@test.com");

    const after = Date.now();
    const insertCall = mockSql.mock.calls[1]!;
    const expiresAt = insertCall.arguments[3] as Date;
    assert.ok(expiresAt instanceof Date);
    const expectedMs = 15 * 60 * 1000;
    assert.ok(expiresAt.getTime() >= before + expectedMs - 500);
    assert.ok(expiresAt.getTime() <= after + expectedMs + 500);
  });

  it("calls sendVerificationEmail with correct email and code", async () => {
    mockRandomInt.mock.mockImplementation(() => 5);

    await sendVerificationOtp("user-1", "user@test.com");

    assert.equal(mockSendVerificationEmail.mock.callCount(), 1);
    assert.equal(
      mockSendVerificationEmail.mock.calls[0]!.arguments[0],
      "user@test.com",
    );
    assert.equal(
      mockSendVerificationEmail.mock.calls[0]!.arguments[1],
      "000005",
    );
  });

  it("propagates SMTP failure (does not suppress)", async () => {
    mockSendVerificationEmail.mock.mockImplementation(async () => {
      throw new Error("SMTP failed");
    });

    await assert.rejects(
      () => sendVerificationOtp("user-1", "user@test.com"),
      /SMTP failed/,
    );
  });
});

describe("verifyOtp", () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
  });

  it("throws INVALID_CODE when DELETE returns no row", async () => {
    mockSql.mock.mockImplementation(() => []);

    await assert.rejects(
      () => verifyOtp("user-1", "123456"),
      (error) => assertErrorWithCodeAndStatus(error, "INVALID_CODE", 400),
    );
  });

  it("throws CODE_EXPIRED when expires_at is in the past", async () => {
    mockSql.mock.mockImplementation(() => [
      { expires_at: new Date("2000-01-01") },
    ]);

    await assert.rejects(
      () => verifyOtp("user-1", "123456"),
      (error) => assertErrorWithCodeAndStatus(error, "CODE_EXPIRED", 400),
    );
  });

  it("calls UPDATE users SET email_verified on success", async () => {
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return [{ expires_at: new Date(Date.now() + 60_000) }];
      return [];
    });

    await verifyOtp("user-1", "123456");

    assert.equal(callCount, 2);
    const updateCall = mockSql.mock.calls[1]!;
    const sqlStrings = updateCall.arguments[0] as string[];
    const sqlText = (sqlStrings[0] ?? "").trim();
    assert.ok(sqlText.startsWith("UPDATE"), "second SQL call should be UPDATE");
    assert.ok(
      sqlText.includes("email_verified"),
      "should update email_verified",
    );
  });

  it("returns void on success", async () => {
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return [{ expires_at: new Date(Date.now() + 60_000) }];
      return [];
    });

    const result = await verifyOtp("user-1", "123456");
    assert.equal(result, undefined);
  });
});
