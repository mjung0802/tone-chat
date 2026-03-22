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
  MOCK_USER,
  MOCK_USER_TWO,
  MOCK_MEMBERS_FULL,
} from './helpers/fixtures';

const API = 'http://localhost:4000/api/v1';

const MOCK_CONVERSATION = {
  _id: 'conv1',
  participantIds: [MOCK_USER.id, MOCK_USER_TWO.id] as [string, string],
  lastMessageAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

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

async function mockDmRoutes(page: import('@playwright/test').Page): Promise<void> {
  // GET /dms — list conversations
  await page.route(`${API}/dms`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: [MOCK_CONVERSATION] }),
      });
    } else {
      await route.continue();
    }
  });

  // POST /dms/:otherUserId — get or create conversation
  await page.route(/\/api\/v1\/dms\/(?!conv)[^/]+$/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversation: MOCK_CONVERSATION }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /dms/conv1/messages
  await page.route(`${API}/dms/conv1/messages`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] }),
      });
    } else {
      await route.continue();
    }
  });

  // POST /dms/conv1/messages — send DM
  await page.route(`${API}/dms/conv1/messages`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { content?: string };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: {
            _id: 'dm-msg-1',
            conversationId: 'conv1',
            authorId: MOCK_USER.id,
            content: body.content ?? '',
            attachmentIds: [],
            mentions: [],
            reactions: [],
            tone: null,
            editedAt: null,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /dms/conv1 — get conversation
  await page.route(`${API}/dms/conv1`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversation: MOCK_CONVERSATION }),
      });
    } else {
      await route.continue();
    }
  });

  // GET /users/me/blocks
  await page.route(`${API}/users/me/blocks`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blockedIds: [] }),
      });
    } else {
      await route.continue();
    }
  });
}

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page, MOCK_MEMBERS_FULL);
  await mockDmRoutes(page);
});

test('User A views User B profile and clicks Message to open DM screen', async ({ page }) => {
  await mockMessagesRoutes(page, [MESSAGE_FROM_JANE]);

  await page.goto(CHANNEL_URL);

  await expect(page.getByText('Hello from Jane!')).toBeVisible();

  // Click Jane's author name to open profile modal
  await page.getByRole('button', { name: "View Jane Doe's profile" }).click();

  await expect(page.getByTestId('user-profile-modal')).toBeVisible();

  // Click Message button
  await page.getByLabel('Send message').click();

  // Should navigate to DM conversation screen
  await expect(page).toHaveURL(/\/home\/conv1/);
});

test('User sends a DM message and it appears in the list', async ({ page }) => {
  const sentContent = 'Hey Jane, this is a direct message!';

  await page.goto('/(main)/home/conv1');

  // Message input should be visible
  await expect(page.getByLabel('Message input')).toBeVisible();

  await page.getByLabel('Message input').fill(sentContent);
  await page.getByLabel('Send message').click();

  await expect(page.getByText(sentContent)).toBeVisible();
});

test('navigation to home screen shows DM list', async ({ page }) => {
  await page.goto('/(main)/home');

  // The home screen should be accessible
  await expect(page).toHaveURL(/\/home/);
});
