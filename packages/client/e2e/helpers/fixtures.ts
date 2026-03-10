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
  display_name: 'Test User',
  pronouns: null,
  avatar_url: null,
  status: 'online',
  bio: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const MOCK_SERVER = {
  _id: 'server-001',
  name: 'Test Server',
  ownerId: 'user-001',
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

export const MOCK_MESSAGES = [
  {
    _id: 'msg-001',
    channelId: 'channel-001',
    serverId: 'server-001',
    authorId: 'user-001',
    content: 'Hello from test',
    attachmentIds: [],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: 'msg-002',
    channelId: 'channel-001',
    serverId: 'server-001',
    authorId: 'user-001',
    content: 'Second test message',
    attachmentIds: [],
    createdAt: '2024-01-01T00:01:00.000Z',
  },
];

export const MOCK_MEMBERS = [
  {
    _id: 'member-001',
    serverId: 'server-001',
    userId: 'user-001',
    roles: [],
    joinedAt: '2024-01-01T00:00:00.000Z',
    username: 'testuser',
    display_name: 'Test User',
  },
];
