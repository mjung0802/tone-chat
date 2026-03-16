import type { NextFunction, Response } from "express";
import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import type { AuthRequest } from "./auth.js";

const mockVerify = mock.fn<AnyFn>();
mock.module("jsonwebtoken", {
  defaultExport: { verify: mockVerify },
  namedExports: { verify: mockVerify },
});

mock.module("../../config/index.js", {
  namedExports: { config: { jwtSecret: "test-secret" } },
});

const { requireAuth } = await import("./auth.js");

type TestResponse = Response & { statusCode: number; _json: unknown };

function makeReq(
  overrides: Partial<Pick<AuthRequest, "headers">> = {},
): AuthRequest {
  return { headers: {}, ...overrides } as AuthRequest;
}
function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  res.status = (c: number) => {
    res.statusCode = c;
    return res;
  };
  res.json = (d: unknown) => {
    res._json = d;
    return res;
  };
  return res;
}

describe("requireAuth", () => {
  beforeEach(() => {
    mockVerify.mock.resetCalls();
  });

  it("returns 401 MISSING_TOKEN when no Authorization header", () => {
    const req = makeReq();
    const res = makeRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "MISSING_TOKEN",
    );
  });

  it("returns 401 MISSING_TOKEN when header does not start with Bearer", () => {
    const req = makeReq({ headers: { authorization: "Basic abc123" } });
    const res = makeRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "MISSING_TOKEN",
    );
  });

  it("returns 401 INVALID_TOKEN when jwt.verify throws", () => {
    mockVerify.mock.mockImplementation(() => {
      throw new Error("bad token");
    });
    const req = makeReq({ headers: { authorization: "Bearer bad-token" } });
    const res = makeRes();
    requireAuth(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "INVALID_TOKEN",
    );
  });

  it("sets req.userId and calls next() on valid token", () => {
    mockVerify.mock.mockImplementation(() => ({ sub: "user-123" }));
    const req = makeReq({ headers: { authorization: "Bearer valid-token" } });
    const res = makeRes();
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };
    requireAuth(req, res, next);
    assert.equal(req.userId, "user-123");
    assert.equal(nextCalled, true);
  });
});
