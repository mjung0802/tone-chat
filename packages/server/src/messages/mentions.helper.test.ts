import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { emitMentionEvents } = await import('./mentions.helper.js');

describe('emitMentionEvents', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let io: any;
  let emittedEvents: Array<{ room: string; event: string; data: unknown }>;

  beforeEach(() => {
    emittedEvents = [];
    io = {
      to: mock.fn((room: string) => ({
        emit: mock.fn((event: string, data: unknown) => {
          emittedEvents.push({ room, event, data });
        }),
      })),
    };
  });

  it('emits mention event to each unique mentioned user room', async () => {
    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['user2', 'user3']);

    assert.equal(emittedEvents.length, 2);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
    assert.equal(emittedEvents[0]!.event, 'mention');
    assert.deepEqual(emittedEvents[0]!.data, {
      messageId: 'msg1',
      channelId: 'ch1',
      serverId: 'srv1',
      authorId: 'sender1',
    });
    assert.equal(emittedEvents[1]!.room, 'user:user3');
  });

  it('excludes sender from mention events', async () => {
    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['sender1', 'user2']);

    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
  });

  it('deduplicates repeated user IDs', async () => {
    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['user2', 'user2']);

    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
  });

  it('does nothing for empty mentions', async () => {
    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', []);

    assert.equal(emittedEvents.length, 0);
  });
});
