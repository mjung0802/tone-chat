// Build a real-shaped JWT: header.payload.signature
// payload: { sub: 'user-001', exp: 9999999999 } — far-future exp so isTokenExpired() always passes
function buildJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.fakesignature`;
}

export const MOCK_ACCESS_TOKEN = buildJwt({ sub: 'user-001', exp: 9999999999 });
export const MOCK_REFRESH_TOKEN = 'mock-refresh-token-opaque-string';

export const MOCK_USER = {
  id: 'user-001',
  username: 'testuser',
  email: 'test@example.com',
  email_verified: true,
  display_name: 'Test User',
  pronouns: null,
  avatar_url: null as string | null,
  bio: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_SERVER = {
  _id: 'server-001',
  name: 'Test Server',
  ownerId: 'user-001',
  icon: 'mock-icon-attachment-id' as string | null,
  description: 'A test server',
  visibility: 'public' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const MOCK_CHANNEL = {
  _id: 'channel-001',
  serverId: 'server-001',
  name: 'general',
  type: 'text' as const,
  position: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const MOCK_REACTIONS = [
  { emoji: '👍', userIds: ['user-001', 'user-002'] },
  { emoji: '🔥', userIds: ['user-002'] },
];

export const MOCK_MESSAGES = [
  {
    _id: 'msg-001',
    channelId: 'channel-001',
    serverId: 'server-001',
    authorId: 'user-001',
    content: 'Hello from test',
    attachmentIds: [],
    reactions: MOCK_REACTIONS,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: 'msg-002',
    channelId: 'channel-001',
    serverId: 'server-001',
    authorId: 'user-001',
    content: 'Second test message',
    attachmentIds: [],
    reactions: [],
    createdAt: '2024-01-01T00:01:00.000Z',
  },
];

export const MOCK_MEMBER_TWO = {
  _id: 'member-002',
  serverId: 'server-001',
  userId: 'user-002',
  role: 'member',
  joinedAt: '2024-01-01T00:00:00.000Z',
  username: 'janedoe',
  display_name: 'Jane Doe',
};

export const MOCK_MEMBERS = [
  {
    _id: 'member-001',
    serverId: 'server-001',
    userId: 'user-001',
    role: 'admin',
    joinedAt: '2024-01-01T00:00:00.000Z',
    username: 'testuser',
    display_name: 'Test User',
  },
];

export const MOCK_MEMBERS_FULL = [
  MOCK_MEMBERS[0]!,
  MOCK_MEMBER_TWO,
];

export const MOCK_MESSAGE_WITH_REPLY = {
  _id: 'msg-reply-001',
  channelId: 'channel-001',
  serverId: 'server-001',
  authorId: 'user-002',
  content: 'This is a reply',
  attachmentIds: [],
  reactions: [],
  replyTo: {
    messageId: 'msg-001',
    authorId: 'user-002',
    authorName: 'Jane Doe',
    content: 'Hello from test',
  },
  createdAt: '2024-01-01T00:02:00.000Z',
};

// 1x1 red PNG as a data URI for avatar image tests
const AVATAR_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

export const MOCK_ATTACHMENT_ICON = {
  id: 'mock-icon-attachment-id',
  uploader_id: 'user-001',
  filename: 'server-icon.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 3000,
  storage_key: 'uploads/server-icon.jpg',
  status: 'ready' as const,
  url: AVATAR_DATA_URI,
  created_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_ATTACHMENT_AVATAR = {
  id: 'att-avatar-001',
  uploader_id: 'user-001',
  filename: 'avatar.jpg',
  mime_type: 'image/jpeg',
  size_bytes: 5000,
  storage_key: 'uploads/avatar.jpg',
  status: 'ready' as const,
  url: AVATAR_DATA_URI,
  created_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_CUSTOM_TONE = {
  key: 'silly',
  label: 'Silly',
  emoji: '🤪',
  colorLight: '#ff6b6b',
  colorDark: '#ff8c8c',
  textStyle: 'italic' as const,
};

export const MOCK_USER_TWO = {
  id: 'user-002',
  username: 'janedoe',
  email: 'jane@example.com',
  email_verified: true,
  display_name: 'Jane Doe',
  pronouns: null as string | null,
  avatar_url: null as string | null,
  bio: 'Hello from Jane',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_SERVER_TWO = {
  _id: 'server-002',
  name: 'Second Server',
  ownerId: 'user-001',
  icon: null as string | null,
  description: 'A second test server',
  visibility: 'public' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const MOCK_CHANNEL_TWO = {
  _id: 'channel-002',
  serverId: 'server-002',
  name: 'announcements',
  type: 'text' as const,
  position: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const MOCK_CHANNEL_SECONDARY = {
  _id: 'channel-003',
  serverId: 'server-001',
  name: 'off-topic',
  type: 'text' as const,
  position: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const MOCK_AUDIT_LOG_ENTRIES = [
  {
    _id: 'audit-001',
    serverId: 'server-001',
    action: 'ban' as const,
    actorId: 'user-001',
    targetId: 'user-002',
    metadata: { reason: 'Spamming channels' },
    createdAt: '2024-01-01T00:05:00.000Z',
    actorUsername: 'testuser',
    actorDisplayName: 'Test User',
    targetUsername: 'janedoe',
    targetDisplayName: 'Jane Doe',
  },
  {
    _id: 'audit-002',
    serverId: 'server-001',
    action: 'mute' as const,
    actorId: 'user-001',
    targetId: 'user-002',
    metadata: { duration: 60 },
    createdAt: '2024-01-01T00:04:00.000Z',
    actorUsername: 'testuser',
    actorDisplayName: 'Test User',
    targetUsername: 'janedoe',
    targetDisplayName: 'Jane Doe',
  },
  {
    _id: 'audit-003',
    serverId: 'server-001',
    action: 'promote' as const,
    actorId: 'user-001',
    targetId: 'user-002',
    metadata: { fromRole: 'member', toRole: 'mod' },
    createdAt: '2024-01-01T00:03:00.000Z',
    actorUsername: 'testuser',
    actorDisplayName: 'Test User',
    targetUsername: 'janedoe',
    targetDisplayName: 'Jane Doe',
  },
];

export const MOCK_MESSAGE_WITH_MENTION = {
  _id: 'msg-mention-001',
  channelId: 'channel-001',
  serverId: 'server-001',
  authorId: 'user-002',
  content: 'Hey @testuser check this out',
  attachmentIds: [],
  reactions: [],
  mentions: ['user-001'],
  createdAt: '2024-01-01T00:03:00.000Z',
};
