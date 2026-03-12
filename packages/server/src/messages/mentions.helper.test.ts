import { mock, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

type GetMemberFn = (userId: string, serverId: string, targetUserId: string) => Promise<{ status: number }>;
const mockGetMember = mock.fn<GetMemberFn>();
mock.module('../members/members.client.js', {
  namedExports: { getMember: mockGetMember },
});

const { emitMentionEvents } = await import('./mentions.helper.js');

describe('emitMentionEvents', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let io: any;
  let emittedEvents: Array<{ room: string; event: string; data: unknown }>;

  beforeEach(() => {
    mockGetMember.mock.resetCalls();
    emittedEvents = [];
    io = {
      to: mock.fn((room: string) => ({
        emit: mock.fn((event: string, data: unknown) => {
          emittedEvents.push({ room, event, data });
        }),
      })),
    };
  });

  it('emits mention event to each mentioned user room', async () => {
    mockGetMember.mock.mockImplementation(async () => ({ status: 200 }));

    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['user2', 'user3']);

    assert.equal(emittedEvents.length, 2);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
    assert.equal(emittedEvents[0]!.event, 'mention');
    assert.deepEqual(emittedEvents[0]!.data, { messageId: 'msg1', channelId: 'ch1', serverId: 'srv1', authorId: 'sender1' });
    assert.equal(emittedEvents[1]!.room, 'user:user3');
  });

  it('excludes sender from mention events', async () => {
    mockGetMember.mock.mockImplementation(async () => ({ status: 200 }));

    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['sender1', 'user2']);

    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
  });

  it('skips non-members silently', async () => {
    mockGetMember.mock.mockImplementation(async (_uid: string, _sid: string, targetId: string) => {
      if (targetId === 'user2') return { status: 200 };
      return { status: 404 };
    });

    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', ['user2', 'nonmember']);

    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0]!.room, 'user:user2');
  });

  it('does nothing for empty mentions', async () => {
    await emitMentionEvents(io, 'sender1', 'srv1', 'ch1', 'msg1', []);

    assert.equal(emittedEvents.length, 0);
    assert.equal(mockGetMember.mock.callCount(), 0);
  });
});
