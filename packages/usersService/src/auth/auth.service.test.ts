import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

// Mock sql as a callable tagged-template + .begin()
type TxFn = (..._args: unknown[]) => unknown[];
type TransactionCallback = (tx: TxFn) => unknown;
type SqlMockFn = (...args: unknown[]) => unknown[];
type BeginMockFn = (fn: TransactionCallback) => unknown;

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, "object");
  assert.notEqual(error, null);
  assert.ok("code" in (error as Record<string, unknown>));
  assert.equal((error as { code: string }).code, code);
  return true;
}

const mockSql = mock.fn<SqlMockFn>((..._args) => {
  void _args;
  return [];
}) as ReturnType<typeof mock.fn<SqlMockFn>> & {
  begin: ReturnType<typeof mock.fn<BeginMockFn>>;
};
mockSql.begin = mock.fn<BeginMockFn>((..._args) => {
  void _args;
  return undefined;
});

mock.module("../config/database.js", { namedExports: { sql: mockSql } });

const mockHash = mock.fn<AnyFn>();
const mockCompare = mock.fn<AnyFn>();
mock.module("bcrypt", {
  defaultExport: { hash: mockHash, compare: mockCompare },
  namedExports: { hash: mockHash, compare: mockCompare },
});

const mockSign = mock.fn<AnyFn>();
mock.module("jsonwebtoken", {
  defaultExport: { sign: mockSign },
  namedExports: { sign: mockSign },
});

mock.module("../config/index.js", {
  namedExports: {
    config: {
      jwtSecret: "secret",
      jwtAccessExpiresIn: "15m",
      jwtRefreshExpiresDays: 7,
    },
  },
});

const mockSendVerificationOtp = mock.fn<AnyFn>(async () => {});
mock.module("./verification.service.js", {
  namedExports: { sendVerificationOtp: mockSendVerificationOtp },
});

const { registerUser, loginUser, refreshAccessToken } =
  await import("./auth.service.js");

function makeUser(overrides: Record<string, unknown> = {}) {
  return { id: "u1", username: "alice", email: "alice@test.com", ...overrides };
}

describe("registerUser", () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockSql.begin.mock.resetCalls();
    mockHash.mock.resetCalls();
    mockSign.mock.resetCalls();
    mockSendVerificationOtp.mock.resetCalls();
    mockSendVerificationOtp.mock.mockImplementation(async () => {});
  });

  it("throws WEAK_PASSWORD when password < 8 chars", async () => {
    await assert.rejects(
      () => registerUser("alice", "a@test.com", "short"),
      (error) => assertErrorCode(error, "WEAK_PASSWORD"),
    );
  });

  it("throws USER_EXISTS when duplicate found", async () => {
    mockSql.mock.mockImplementation(() => [{ id: "existing" }]);
    await assert.rejects(
      () => registerUser("alice", "a@test.com", "password123"),
      (error) => assertErrorCode(error, "USER_EXISTS"),
    );
  });

  it("calls bcrypt.hash with salt rounds 12", async () => {
    mockSql.mock.mockImplementation(() => []);
    mockHash.mock.mockImplementation(async () => "hashed");
    mockSign.mock.mockImplementation(() => "access-token");
    // sql.begin returns the transaction result
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: TransactionCallback) => {
      const tx = mock.fn<TxFn>((..._args) => {
        void _args;
        return [user];
      });
      return fn(tx);
    });

    await registerUser("alice", "a@test.com", "password123");
    assert.equal(mockHash.mock.calls[0]!.arguments[1], 12);
  });

  it("uses sql.begin() for atomic insert", async () => {
    mockSql.mock.mockImplementation(() => []);
    mockHash.mock.mockImplementation(async () => "hashed");
    mockSign.mock.mockImplementation(() => "token");
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: TransactionCallback) => {
      const tx = mock.fn<TxFn>((..._args) => {
        void _args;
        return [user];
      });
      return fn(tx);
    });

    await registerUser("alice", "a@test.com", "password123");
    assert.equal(mockSql.begin.mock.callCount(), 1);
  });

  it("returns { user, accessToken, refreshToken }", async () => {
    mockSql.mock.mockImplementationOnce(() => []); // existing check
    mockHash.mock.mockImplementation(async () => "hashed");
    mockSign.mock.mockImplementation(() => "access-tok");
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: TransactionCallback) => {
      const tx = mock.fn<TxFn>((..._args) => {
        void _args;
        return [user];
      });
      return fn(tx);
    });
    // createRefreshToken sql insert
    mockSql.mock.mockImplementation(() => []);

    const result = await registerUser("alice", "a@test.com", "password123");
    assert.equal(result.user.id, "u1");
    assert.equal(result.accessToken, "access-tok");
    assert.equal(typeof result.refreshToken, "string");
  });

  it("calls sendVerificationOtp with userId and email after successful registration", async () => {
    mockSql.mock.mockImplementation(() => []);
    mockHash.mock.mockImplementation(async () => "hashed");
    mockSign.mock.mockImplementation(() => "access-tok");
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: TransactionCallback) => {
      const tx = mock.fn<TxFn>((..._args) => {
        void _args;
        return [user];
      });
      return fn(tx);
    });

    await registerUser("alice", "a@test.com", "password123");

    // Fire-and-forget: give it a tick to run
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(mockSendVerificationOtp.mock.callCount(), 1);
    assert.equal(mockSendVerificationOtp.mock.calls[0]!.arguments[0], "u1");
    assert.equal(
      mockSendVerificationOtp.mock.calls[0]!.arguments[1],
      "a@test.com",
    );
  });

  it("still returns result when sendVerificationOtp rejects (fire-and-forget)", async () => {
    mockSql.mock.mockImplementation(() => []);
    mockHash.mock.mockImplementation(async () => "hashed");
    mockSign.mock.mockImplementation(() => "access-tok");
    const user = makeUser();
    mockSql.begin.mock.mockImplementation(async (fn: TransactionCallback) => {
      const tx = mock.fn<TxFn>((..._args) => {
        void _args;
        return [user];
      });
      return fn(tx);
    });
    mockSendVerificationOtp.mock.mockImplementation(async () => {
      throw new Error("SMTP failed");
    });

    const result = await registerUser("alice", "a@test.com", "password123");
    assert.equal(result.user.id, "u1");
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockCompare.mock.resetCalls();
    mockSign.mock.resetCalls();
  });

  it("throws INVALID_CREDENTIALS when user not found", async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(
      () => loginUser("a@test.com", "password123"),
      (error) => assertErrorCode(error, "INVALID_CREDENTIALS"),
    );
  });

  it("throws INVALID_CREDENTIALS when wrong password", async () => {
    const user = makeUser();
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [user];
      return [{ password_hash: "hashed" }];
    });
    mockCompare.mock.mockImplementation(async () => false);

    await assert.rejects(
      () => loginUser("a@test.com", "wrong"),
      (error) => assertErrorCode(error, "INVALID_CREDENTIALS"),
    );
  });

  it("returns tokens on success", async () => {
    const user = makeUser();
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return [user];
      if (callCount === 2) return [{ password_hash: "hashed" }];
      return [];
    });
    mockCompare.mock.mockImplementation(async () => true);
    mockSign.mock.mockImplementation(() => "access-tok");

    const result = await loginUser("a@test.com", "password123");
    assert.equal(result.user.id, "u1");
    assert.equal(result.accessToken, "access-tok");
    assert.equal(typeof result.refreshToken, "string");
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    mockSql.mock.resetCalls();
    mockSign.mock.resetCalls();
  });

  it("throws INVALID_TOKEN when token hash not found", async () => {
    mockSql.mock.mockImplementation(() => []);
    await assert.rejects(
      () => refreshAccessToken("bad-token"),
      (error) => assertErrorCode(error, "INVALID_TOKEN"),
    );
  });

  it("throws TOKEN_EXPIRED when expired (atomic DELETE RETURNING)", async () => {
    // Atomic: DELETE ... RETURNING returns the expired row in a single query
    mockSql.mock.mockImplementation(() => {
      return [{ id: "rt1", user_id: "u1", expires_at: new Date("2000-01-01") }];
    });

    await assert.rejects(
      () => refreshAccessToken("expired-token"),
      (error) => assertErrorCode(error, "TOKEN_EXPIRED"),
    );
  });

  it("rotates: atomic delete + returns new tokens", async () => {
    let callCount = 0;
    mockSql.mock.mockImplementation(() => {
      callCount++;
      // Call 1: DELETE ... RETURNING (returns existing valid token)
      if (callCount === 1)
        return [
          {
            id: "rt1",
            user_id: "u1",
            expires_at: new Date(Date.now() + 86400000),
          },
        ];
      // Call 2: INSERT new refresh token
      return [];
    });
    mockSign.mock.mockImplementation(() => "new-access");

    const result = await refreshAccessToken("valid-refresh");
    assert.equal(result.accessToken, "new-access");
    assert.equal(typeof result.refreshToken, "string");
    assert.equal(callCount, 2); // DELETE RETURNING + INSERT (no separate SELECT)
  });
});
