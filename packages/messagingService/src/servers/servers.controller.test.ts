import type { Request, Response } from "express";
import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

type RequestOverrides = Partial<
  Pick<Request, "body" | "params" | "headers" | "query">
>;
type TestResponse = Response & { statusCode: number; _json: unknown };

function assertErrorCode(error: unknown, code: string): true {
  assert.equal(typeof error, "object");
  assert.notEqual(error, null);
  assert.equal((error as { code?: unknown }).code, code);
  return true;
}

const mockServerCreate = mock.fn<AnyFn>();
const mockServerFindById = mock.fn<AnyFn>();
const mockServerFind = mock.fn<AnyFn>();
mock.module("./server.model.js", {
  namedExports: {
    Server: {
      create: mockServerCreate,
      findById: mockServerFindById,
      find: mockServerFind,
    },
  },
});

const mockChannelCreate = mock.fn<AnyFn>();
mock.module("../channels/channel.model.js", {
  namedExports: { Channel: { create: mockChannelCreate } },
});

const mockMemberCreate = mock.fn<AnyFn>();
const mockMemberFind = mock.fn<AnyFn>();
mock.module("../members/serverMember.model.js", {
  namedExports: {
    ServerMember: {
      create: mockMemberCreate,
      find: mockMemberFind,
    },
  },
});

const { createServer, getServer, listServers, updateServer, deleteServer } =
  await import("./servers.controller.js");

function makeReq(overrides: RequestOverrides = {}): Request {
  return {
    body: {},
    params: {},
    headers: {},
    query: {},
    ...overrides,
  } as Request;
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
  res.end = () => res;
  return res;
}

describe("createServer", () => {
  beforeEach(() => {
    mockServerCreate.mock.resetCalls();
    mockChannelCreate.mock.resetCalls();
    mockMemberCreate.mock.resetCalls();
  });

  it("returns 400 when name missing", async () => {
    const res = makeRes();
    await createServer(
      makeReq({ headers: { "x-user-id": "u1" }, body: {} }),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "MISSING_FIELDS",
    );
  });

  it("creates server, #general channel, and admin member; returns 201", async () => {
    const server = { _id: "s1", name: "Test" };
    mockServerCreate.mock.mockImplementation(async () => server);
    mockChannelCreate.mock.mockImplementation(async () => ({}));
    mockMemberCreate.mock.mockImplementation(async () => ({}));

    const res = makeRes();
    await createServer(
      makeReq({ headers: { "x-user-id": "u1" }, body: { name: "Test" } }),
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.deepEqual((res._json as { server: unknown }).server, server);
    assert.equal(mockChannelCreate.mock.callCount(), 1);
    assert.equal(
      (mockChannelCreate.mock.calls[0]!.arguments[0] as { name: string }).name,
      "general",
    );
    assert.equal(mockMemberCreate.mock.callCount(), 1);
    assert.deepEqual(
      (mockMemberCreate.mock.calls[0]!.arguments[0] as { roles: string[] })
        .roles,
      ["admin"],
    );
  });
});

describe("getServer", () => {
  beforeEach(() => mockServerFindById.mock.resetCalls());

  it("throws SERVER_NOT_FOUND on null", async () => {
    mockServerFindById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => getServer(makeReq({ params: { serverId: "s1" } }), makeRes()),
      (error) => assertErrorCode(error, "SERVER_NOT_FOUND"),
    );
  });

  it("returns 200 with server", async () => {
    const server = { _id: "s1", name: "Test" };
    mockServerFindById.mock.mockImplementation(async () => server);
    const res = makeRes();
    await getServer(makeReq({ params: { serverId: "s1" } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { server: unknown }).server, server);
  });
});

describe("listServers", () => {
  beforeEach(() => {
    mockMemberFind.mock.resetCalls();
    mockServerFind.mock.resetCalls();
  });

  it("queries member→server chain and returns 200", async () => {
    mockMemberFind.mock.mockImplementation(() => ({
      select: () => [{ serverId: "s1" }, { serverId: "s2" }],
    }));
    const servers = [{ _id: "s1" }, { _id: "s2" }];
    mockServerFind.mock.mockImplementation(() => ({ sort: () => servers }));

    const res = makeRes();
    await listServers(makeReq({ headers: { "x-user-id": "u1" } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res._json as { servers: unknown[] }).servers, servers);
  });
});

describe("updateServer", () => {
  beforeEach(() => mockServerFindById.mock.resetCalls());

  it("throws SERVER_NOT_FOUND when server is null", async () => {
    mockServerFindById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () =>
        updateServer(
          makeReq({
            headers: { "x-user-id": "u1" },
            params: { serverId: "s1" },
          }),
          makeRes(),
        ),
      (error) => assertErrorCode(error, "SERVER_NOT_FOUND"),
    );
  });

  it("throws FORBIDDEN when not owner", async () => {
    mockServerFindById.mock.mockImplementation(async () => ({
      ownerId: "other",
    }));
    await assert.rejects(
      () =>
        updateServer(
          makeReq({
            headers: { "x-user-id": "u1" },
            params: { serverId: "s1" },
          }),
          makeRes(),
        ),
      (error) => assertErrorCode(error, "FORBIDDEN"),
    );
  });

  it("updates fields and returns 200", async () => {
    const server = {
      ownerId: "u1",
      name: "Old",
      description: "",
      save: mock.fn(async () => {}),
    };
    mockServerFindById.mock.mockImplementation(async () => server);

    const res = makeRes();
    await updateServer(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { serverId: "s1" },
        body: { name: "New", description: "desc" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(server.name, "New");
    assert.equal(server.description, "desc");
    assert.equal(server.save.mock.callCount(), 1);
  });

  it("updates icon field and returns 200", async () => {
    const server = {
      ownerId: "u1",
      name: "Test",
      icon: "",
      save: mock.fn(async () => {}),
    };
    mockServerFindById.mock.mockImplementation(async () => server);

    const res = makeRes();
    await updateServer(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { serverId: "s1" },
        body: { icon: "att-icon-001" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(server.icon, "att-icon-001");
    assert.equal(server.save.mock.callCount(), 1);
  });
});

describe("deleteServer", () => {
  beforeEach(() => mockServerFindById.mock.resetCalls());

  it("throws SERVER_NOT_FOUND when server is null", async () => {
    mockServerFindById.mock.mockImplementation(async () => null);
    await assert.rejects(
      () =>
        deleteServer(
          makeReq({
            headers: { "x-user-id": "u1" },
            params: { serverId: "s1" },
          }),
          makeRes(),
        ),
      (error) => assertErrorCode(error, "SERVER_NOT_FOUND"),
    );
  });

  it("throws FORBIDDEN when not owner", async () => {
    mockServerFindById.mock.mockImplementation(async () => ({
      ownerId: "other",
    }));
    await assert.rejects(
      () =>
        deleteServer(
          makeReq({
            headers: { "x-user-id": "u1" },
            params: { serverId: "s1" },
          }),
          makeRes(),
        ),
      (error) => assertErrorCode(error, "FORBIDDEN"),
    );
  });

  it("calls deleteOne and returns 204", async () => {
    const mockDeleteOne = mock.fn(async () => {});
    mockServerFindById.mock.mockImplementation(async () => ({
      ownerId: "u1",
      deleteOne: mockDeleteOne,
    }));

    const res = makeRes();
    await deleteServer(
      makeReq({ headers: { "x-user-id": "u1" }, params: { serverId: "s1" } }),
      res,
    );
    assert.equal(res.statusCode, 204);
    assert.equal(mockDeleteOne.mock.callCount(), 1);
  });
});
