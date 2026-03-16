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

const mockMessageFindOne = mock.fn<AnyFn>();

mock.module("./message.model.js", {
  namedExports: {
    Message: {
      findOne: mockMessageFindOne,
    },
  },
});

const { toggleReaction } = await import("./reactions.controller.js");

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

describe("toggleReaction", () => {
  beforeEach(() => mockMessageFindOne.mock.resetCalls());

  it("returns 400 when emoji is missing", async () => {
    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: {},
      }),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "MISSING_FIELDS",
    );
  });

  it("returns 400 when emoji is empty string", async () => {
    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "   " },
      }),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "INVALID_EMOJI",
    );
  });

  it("returns 400 when emoji is too long", async () => {
    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "a".repeat(33) },
      }),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "INVALID_EMOJI",
    );
  });

  it("throws MESSAGE_NOT_FOUND when message does not exist", async () => {
    mockMessageFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () =>
        toggleReaction(
          makeReq({
            headers: { "x-user-id": "u1" },
            params: { channelId: "c1", messageId: "m1" },
            body: { emoji: "\u{1F44D}" },
          }),
          makeRes(),
        ),
      (error) => assertErrorCode(error, "MESSAGE_NOT_FOUND"),
    );
  });

  it("adds a new reaction", async () => {
    const message = {
      reactions: [] as { emoji: string; userIds: string[] }[],
      save: mock.fn(async () => {}),
    };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "\u{1F44D}" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(message.reactions.length, 1);
    assert.equal(message.reactions[0]!.emoji, "\u{1F44D}");
    assert.deepEqual(message.reactions[0]!.userIds, ["u1"]);
    assert.equal(message.save.mock.callCount(), 1);
  });

  it("adds user to existing reaction", async () => {
    const message = {
      reactions: [{ emoji: "\u{1F44D}", userIds: ["u2"] }],
      save: mock.fn(async () => {}),
    };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "\u{1F44D}" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(message.reactions[0]!.userIds, ["u2", "u1"]);
  });

  it("toggles off when user already reacted", async () => {
    const message = {
      reactions: [{ emoji: "\u{1F44D}", userIds: ["u1", "u2"] }],
      save: mock.fn(async () => {}),
    };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "\u{1F44D}" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(message.reactions[0]!.userIds, ["u2"]);
  });

  it("removes reaction entry when last user toggles off", async () => {
    const message = {
      reactions: [{ emoji: "\u{1F44D}", userIds: ["u1"] }],
      save: mock.fn(async () => {}),
    };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "\u{1F44D}" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(message.reactions.length, 0);
  });

  it("returns 400 MAX_REACTIONS when 10 unique emojis exist", async () => {
    const reactions = Array.from({ length: 10 }, (_, i) => ({
      emoji: String(i),
      userIds: ["u2"],
    }));
    const message = {
      reactions,
      save: mock.fn(async () => {}),
    };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "\u{1F195}" },
      }),
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(
      (res._json as { error: { code: string } }).error.code,
      "MAX_REACTIONS",
    );
  });

  it("allows adding to existing emoji even at 10 unique limit", async () => {
    const reactions = Array.from({ length: 10 }, (_, i) => ({
      emoji: String(i),
      userIds: ["u2"],
    }));
    const message = {
      reactions,
      save: mock.fn(async () => {}),
    };
    mockMessageFindOne.mock.mockImplementation(async () => message);

    const res = makeRes();
    await toggleReaction(
      makeReq({
        headers: { "x-user-id": "u1" },
        params: { channelId: "c1", messageId: "m1" },
        body: { emoji: "0" },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(message.reactions[0]!.userIds, ["u2", "u1"]);
  });
});
