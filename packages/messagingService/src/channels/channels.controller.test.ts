import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const mockChannelCreate = mock.fn();
const mockChannelFind = mock.fn();
const mockChannelFindOne = mock.fn();
const mockChannelFindOneAndDelete = mock.fn();

await mock.module('./channel.model.js', {
  namedExports: {
    Channel: {
      create: mockChannelCreate,
      find: mockChannelFind,
      findOne: mockChannelFindOne,
      findOneAndDelete: mockChannelFindOneAndDelete,
    },
  },
});

const { createChannel, listChannels, getChannel, updateChannel, deleteChannel } = await import('./channels.controller.js');

function makeReq(overrides: Partial<{ body: any; params: any; headers: any; query: any }> = {}) {
  return { body: {}, params: {}, headers: {}, query: {}, ...overrides } as any;
}
function makeRes() {
  const res: any = { statusCode: 200, _json: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: unknown) => { res._json = d; return res; };
  res.end = () => res;
  return res;
}

describe('createChannel', () => {
  beforeEach(() => {
    mockChannelCreate.mock.resetCalls();
    mockChannelFindOne.mock.resetCalls();
  });

  it('returns 400 when name missing', async () => {
    const res = makeRes();
    await createChannel(makeReq({ params: { serverId: 's1' }, body: {} }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(res._json.error.code, 'MISSING_FIELDS');
  });

  it('auto-positions and defaults type to text; returns 201', async () => {
    // findOne for maxPos returns null (no existing channels)
    mockChannelFindOne.mock.mockImplementation(() => ({
      sort: () => ({ select: () => null }),
    }));
    const channel = { _id: 'c1', name: 'voice', type: 'text', position: 0 };
    mockChannelCreate.mock.mockImplementation(async () => channel);

    const res = makeRes();
    await createChannel(makeReq({ params: { serverId: 's1' }, body: { name: 'voice' } }), res);
    assert.equal(res.statusCode, 201);
    // Verify type defaults to 'text'
    assert.equal(mockChannelCreate.mock.calls[0]!.arguments[0].type, 'text');
  });

  it('auto-positions after existing channels', async () => {
    mockChannelFindOne.mock.mockImplementation(() => ({
      sort: () => ({ select: () => ({ position: 3 }) }),
    }));
    mockChannelCreate.mock.mockImplementation(async (data: any) => data);

    const res = makeRes();
    await createChannel(makeReq({ params: { serverId: 's1' }, body: { name: 'new' } }), res);
    assert.equal(mockChannelCreate.mock.calls[0]!.arguments[0].position, 4);
  });
});

describe('listChannels', () => {
  it('returns 200 with sorted channels', async () => {
    const channels = [{ _id: 'c1' }, { _id: 'c2' }];
    mockChannelFind.mock.mockImplementation(() => ({ sort: () => channels }));

    const res = makeRes();
    await listChannels(makeReq({ params: { serverId: 's1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.channels, channels);
  });
});

describe('getChannel', () => {
  beforeEach(() => mockChannelFindOne.mock.resetCalls());

  it('throws CHANNEL_NOT_FOUND when null', async () => {
    mockChannelFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => getChannel(makeReq({ params: { serverId: 's1', channelId: 'c1' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'CHANNEL_NOT_FOUND'); return true; },
    );
  });

  it('returns 200 with channel', async () => {
    const channel = { _id: 'c1', name: 'general' };
    mockChannelFindOne.mock.mockImplementation(async () => channel);
    const res = makeRes();
    await getChannel(makeReq({ params: { serverId: 's1', channelId: 'c1' } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res._json.channel, channel);
  });
});

describe('updateChannel', () => {
  beforeEach(() => mockChannelFindOne.mock.resetCalls());

  it('throws CHANNEL_NOT_FOUND when null', async () => {
    mockChannelFindOne.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => updateChannel(makeReq({ params: { serverId: 's1', channelId: 'c1' }, body: {} }), makeRes()),
      (err: any) => { assert.equal(err.code, 'CHANNEL_NOT_FOUND'); return true; },
    );
  });

  it('updates fields, saves, and returns 200', async () => {
    const channel = { name: 'old', topic: '', position: 0, save: mock.fn(async () => {}) };
    mockChannelFindOne.mock.mockImplementation(async () => channel);

    const res = makeRes();
    await updateChannel(makeReq({
      params: { serverId: 's1', channelId: 'c1' },
      body: { name: 'new', topic: 'updated' },
    }), res);

    assert.equal(channel.name, 'new');
    assert.equal(channel.topic, 'updated');
    assert.equal(channel.save.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
  });
});

describe('deleteChannel', () => {
  beforeEach(() => mockChannelFindOneAndDelete.mock.resetCalls());

  it('throws CHANNEL_NOT_FOUND when null', async () => {
    mockChannelFindOneAndDelete.mock.mockImplementation(async () => null);
    await assert.rejects(
      () => deleteChannel(makeReq({ params: { serverId: 's1', channelId: 'c1' } }), makeRes()),
      (err: any) => { assert.equal(err.code, 'CHANNEL_NOT_FOUND'); return true; },
    );
  });

  it('deletes and returns 204', async () => {
    mockChannelFindOneAndDelete.mock.mockImplementation(async () => ({ _id: 'c1' }));
    const res = makeRes();
    await deleteChannel(makeReq({ params: { serverId: 's1', channelId: 'c1' } }), res);
    assert.equal(res.statusCode, 204);
  });
});
