import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMessagesRoutes,
  mockMembersRoutes,
  mockUsersRoutes,
} from './helpers/mocks';
import {
  MOCK_MESSAGES,
  MOCK_USER,
  MOCK_SERVER,
  MOCK_MEMBERS,
  MOCK_MEMBER_TWO,
} from './helpers/fixtures';

const CHANNEL_URL = '/servers/server-001/channels/channel-001';

// Messages from different authors for testing mod actions
const OTHER_MEMBER_MESSAGE = {
  _id: 'msg-other-001',
  channelId: 'channel-001',
  serverId: 'server-001',
  authorId: 'user-002',
  content: 'Message from regular member',
  attachmentIds: [],
  reactions: [],
  createdAt: '2024-01-01T00:02:00.000Z',
} as (typeof MOCK_MESSAGES)[number];

const MESSAGES_MIXED = [...MOCK_MESSAGES, OTHER_MEMBER_MESSAGE];

// Current user is admin (owner of server), target is a regular member
const ADMIN_MEMBERS = [
  { ...MOCK_MEMBERS[0]!, role: 'admin' },
  { ...MOCK_MEMBER_TWO, role: 'member' },
];

// Current user is a regular member
const MEMBER_ONLY_MEMBERS = [
  { ...MOCK_MEMBERS[0]!, role: 'member' },
  { ...MOCK_MEMBER_TWO, role: 'member' },
];

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockChannelsRoutes(page);
});

test('admin sees mute/kick/ban buttons on hover over other member message', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER]);
  await mockMembersRoutes(page, ADMIN_MEMBERS);
  await mockMessagesRoutes(page, MESSAGES_MIXED);

  await page.goto(CHANNEL_URL);

  // Hover over the message from user-002
  const otherMessage = page.getByLabel('Jane Doe said: Message from regular member', { exact: false });
  await otherMessage.hover();

  await expect(otherMessage.getByLabel('Mute user')).toBeVisible();
  await expect(otherMessage.getByLabel('Kick user')).toBeVisible();
  await expect(otherMessage.getByLabel('Ban user')).toBeVisible();
});

test('regular member does not see mod buttons on hover', async ({ page }) => {
  // Server owned by someone else, user is just a member
  await mockServersRoutes(page, [{ ...MOCK_SERVER, ownerId: 'user-999' }]);
  await mockMembersRoutes(page, MEMBER_ONLY_MEMBERS);
  await mockMessagesRoutes(page, MESSAGES_MIXED);

  await page.goto(CHANNEL_URL);

  const otherMessage = page.getByLabel('Jane Doe said: Message from regular member', { exact: false });
  await otherMessage.hover();

  await expect(otherMessage.getByLabel('Mute user')).not.toBeVisible();
  await expect(otherMessage.getByLabel('Kick user')).not.toBeVisible();
  await expect(otherMessage.getByLabel('Ban user')).not.toBeVisible();
});

test('own messages have no mod buttons', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER]);
  await mockMembersRoutes(page, ADMIN_MEMBERS);
  await mockMessagesRoutes(page, MESSAGES_MIXED);

  await page.goto(CHANNEL_URL);

  // Hover over own message
  const ownMessage = page.getByLabel(`${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`, { exact: false });
  await ownMessage.hover();

  await expect(ownMessage.getByLabel('Mute user')).not.toBeVisible();
  await expect(ownMessage.getByLabel('Kick user')).not.toBeVisible();
  await expect(ownMessage.getByLabel('Ban user')).not.toBeVisible();
});

test('mute button opens duration dialog', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER]);
  await mockMembersRoutes(page, ADMIN_MEMBERS);
  await mockMessagesRoutes(page, MESSAGES_MIXED);

  await page.goto(CHANNEL_URL);

  const otherMessage = page.getByLabel('Jane Doe said: Message from regular member', { exact: false });
  await otherMessage.hover();
  await otherMessage.getByLabel('Mute user').click();

  // Mute dialog should show duration options
  await expect(page.getByText('Mute Jane Doe')).toBeVisible();
  await expect(page.getByText('1 hour')).toBeVisible();
  await expect(page.getByText('1 day')).toBeVisible();
  await expect(page.getByText('7 days')).toBeVisible();
});

test('kick button opens confirmation dialog', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER]);
  await mockMembersRoutes(page, ADMIN_MEMBERS);
  await mockMessagesRoutes(page, MESSAGES_MIXED);

  await page.goto(CHANNEL_URL);

  const otherMessage = page.getByLabel('Jane Doe said: Message from regular member', { exact: false });
  await otherMessage.hover();
  await otherMessage.getByLabel('Kick user').click();

  await expect(page.getByText('Kick Member')).toBeVisible();
  await expect(page.getByText(/Are you sure you want to kick Jane Doe/)).toBeVisible();
});

test('ban button opens reason dialog', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER]);
  await mockMembersRoutes(page, ADMIN_MEMBERS);
  await mockMessagesRoutes(page, MESSAGES_MIXED);

  await page.goto(CHANNEL_URL);

  const otherMessage = page.getByLabel('Jane Doe said: Message from regular member', { exact: false });
  await otherMessage.hover();
  await otherMessage.getByLabel('Ban user').click();

  await expect(page.getByText('Ban Jane Doe')).toBeVisible();
  await expect(page.getByLabel('Ban reason')).toBeVisible();
});
