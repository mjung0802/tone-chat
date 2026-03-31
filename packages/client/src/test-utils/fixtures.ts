import type { Attachment, Message, ServerMember, User } from '../types/models';

export function encodeJwtPayload(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

// Expires in 1 hour from a fixed point far in the future
export const VALID_JWT = encodeJwtPayload({
  sub: 'user-123',
  exp: Math.floor(Date.now() / 1000) + 3600,
});

// Expired 1 hour ago
export const EXPIRED_JWT = encodeJwtPayload({
  sub: 'user-456',
  exp: Math.floor(Date.now() / 1000) - 3600,
});

export const MALFORMED_JWT = 'not.a.jwt';

export function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'msg-1',
    channelId: 'channel-1',
    serverId: 'server-1',
    authorId: 'user-123',
    content: 'Hello world',
    attachmentIds: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeReaction(overrides: Partial<{ emoji: string; userIds: string[] }> = {}) {
  return {
    emoji: '👍',
    userIds: ['user-123'],
    ...overrides,
  };
}

export function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 'att-1',
    uploader_id: 'user-123',
    filename: 'photo.png',
    mime_type: 'image/png',
    size_bytes: 12345,
    storage_key: 'uploads/photo.png',
    status: 'ready',
    url: 'http://localhost:9000/uploads/photo.png',
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeMember(overrides: Partial<ServerMember> = {}): ServerMember {
  return {
    _id: 'member-1',
    serverId: 'server-1',
    userId: 'user-123',
    role: 'member',
    joinedAt: '2025-01-01T00:00:00.000Z',
    username: 'testuser',
    display_name: 'Test User',
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    email_verified: true,
    display_name: 'Test User',
    pronouns: null,
    avatar_url: null,
    bio: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}
