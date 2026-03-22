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
  MOCK_USER_TWO,
  MOCK_MEMBERS_FULL,
} from './helpers/fixtures';

const API = 'http://localhost:4000/api/v1';

const CHANNEL_URL = '/servers/server-001/channels/channel-001';
const MESSAGE_FROM_JANE = {
  _id: 'msg-jane-001',
  channelId: 'channel-001',
  serverId: 'server-001',
  authorId: MOCK_USER_TWO.id,
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
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);
  await mockMessagesRoutes(page, [MESSAGE_FROM_JANE]);

  // Mock DM conversation route for the Message button
  await page.route(/\/api\/v1\/dms\/(?!conv)[^/]+$/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversation: {
            _id: 'conv1',
            participantIds: ['user-001', MOCK_USER_TWO.id],
            lastMessageAt: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
});

test('Block button toggles to Unblock after blocking a user', async ({ page }) => {
  let isBlocked = false;

  // GET /users/me/blocks — starts unblocked, updates after block
  await page.route(`${API}/users/me/blocks`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blockedIds: isBlocked ? [MOCK_USER_TWO.id] : [] }),
      });
    } else {
      await route.continue();
    }
  });

  // POST /users/me/blocks/:userId — block
  await page.route(`${API}/users/me/blocks/${MOCK_USER_TWO.id}`, async (route) => {
    if (route.request().method() === 'POST') {
      isBlocked = true;
      await route.fulfill({ status: 204, body: '' });
    } else if (route.request().method() === 'DELETE') {
      isBlocked = false;
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.continue();
    }
  });

  await page.goto(CHANNEL_URL);

  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  // Open profile modal for Jane
  await page.getByRole('button', { name: 'View Jane Doe\'s profile' }).click();
  await expect(page.getByTestId('user-profile-modal')).toBeVisible();

  // Initially should show "Block user" button
  await expect(page.getByLabel('Block user')).toBeVisible();

  // Click Block
  await page.getByLabel('Block user').click();

  // After blocking, button should change to "Unblock user"
  await expect(page.getByLabel('Unblock user')).toBeVisible();
  await expect(page.getByLabel('Block user')).not.toBeVisible();
});

test('Message button is still visible when user is blocked', async ({ page }) => {
  // User starts as already blocked
  await page.route(`${API}/users/me/blocks`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blockedIds: [MOCK_USER_TWO.id] }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto(CHANNEL_URL);

  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  // Open profile modal for Jane
  await page.getByRole('button', { name: 'View Jane Doe\'s profile' }).click();
  await expect(page.getByTestId('user-profile-modal')).toBeVisible();

  // Message button should still be visible (blocking doesn't hide it, it just prevents sending via API)
  await expect(page.getByLabel('Send message')).toBeVisible();

  // Block button should show Unblock since user is blocked
  await expect(page.getByLabel('Unblock user')).toBeVisible();
});
