import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMessagesRoutes,
  mockMembersRoutes,
  mockUsersRoutes,
  mockInvitesRoutes,
  mockAttachmentRoute,
} from './helpers/mocks';
import {
  MOCK_SERVER,
  MOCK_MEMBERS_FULL,
  MOCK_ATTACHMENT_ICON,
} from './helpers/fixtures';

const CHANNEL_URL = '/servers/server-001/channels/channel-001';
const SETTINGS_URL = `/servers/${MOCK_SERVER._id}/settings`;

// Message authored by user-002 so the author name "Jane Doe" is clickable
const MESSAGE_FROM_JANE = {
  _id: 'msg-jane-001',
  channelId: 'channel-001',
  serverId: 'server-001',
  authorId: 'user-002',
  content: 'Hello from Jane!',
  attachmentIds: [],
  reactions: [],
  createdAt: '2024-01-01T00:05:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
});

test('opens profile modal when clicking author name in chat', async ({ page }) => {
  await mockMessagesRoutes(page, [MESSAGE_FROM_JANE]);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  // Wait for message to appear
  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  // Click the author name button
  await page.getByRole('button', { name: 'View Jane Doe\'s profile' }).click();

  // Modal should be visible with Jane's data
  await expect(page.getByTestId('user-profile-modal')).toBeVisible();
  await expect(page.getByTestId('user-profile-modal').getByText('Jane Doe')).toBeVisible();
});

test('opens profile modal when clicking author avatar in chat', async ({ page }) => {
  await mockMessagesRoutes(page, [MESSAGE_FROM_JANE]);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  // Click the avatar button — distinct label from the name button
  await page.getByRole('button', { name: 'View Jane Doe\'s avatar' }).click();

  await expect(page.getByTestId('user-profile-modal')).toBeVisible();
});

test('opens profile modal when clicking member in member list', async ({ page }) => {
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);
  await mockInvitesRoutes(page);
  await mockAttachmentRoute(page, MOCK_ATTACHMENT_ICON);

  await page.goto(SETTINGS_URL);

  await expect(page.getByText(`Members (${MOCK_MEMBERS_FULL.length})`)).toBeVisible();

  // Click Jane's row — MemberListItem uses accessibilityRole="text", so use text locator
  await page.getByText('Jane Doe').click();

  await expect(page.getByTestId('user-profile-modal')).toBeVisible();
  await expect(page.getByTestId('user-profile-modal').getByText('Jane Doe')).toBeVisible();
});

test('modal shows moderation actions for lower-ranked member', async ({ page }) => {
  await mockMessagesRoutes(page, [MESSAGE_FROM_JANE]);
  // Current user (user-001) is server owner — MOCK_SERVER.ownerId = 'user-001'
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  await page.getByRole('button', { name: 'View Jane Doe\'s profile' }).click();

  await expect(page.getByTestId('user-profile-modal')).toBeVisible();
  // Owner can kick/ban members
  await expect(page.getByLabel('Kick user')).toBeVisible();
  await expect(page.getByLabel('Ban user')).toBeVisible();
});

test('modal closes when Close button is pressed', async ({ page }) => {
  await mockMessagesRoutes(page, [MESSAGE_FROM_JANE]);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);

  await page.goto(CHANNEL_URL);

  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  await page.getByRole('button', { name: 'View Jane Doe\'s profile' }).click();

  await expect(page.getByTestId('user-profile-modal')).toBeVisible();

  await page.getByLabel('Close profile').click();

  await expect(page.getByTestId('user-profile-modal')).not.toBeVisible();
});
