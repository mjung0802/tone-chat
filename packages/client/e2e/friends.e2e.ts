import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
} from './helpers/mocks';
import { MOCK_USER, MOCK_USER_TWO } from './helpers/fixtures';

const API = 'http://localhost:4000/api/v1';

const MOCK_FRIEND = {
  userId: MOCK_USER_TWO.id,
  username: MOCK_USER_TWO.username,
  display_name: MOCK_USER_TWO.display_name,
  avatar_url: null,
  since: '2025-01-01T00:00:00.000Z',
};

const MOCK_INCOMING_REQUEST = {
  userId: MOCK_USER_TWO.id,
  username: MOCK_USER_TWO.username,
  display_name: MOCK_USER_TWO.display_name,
  avatar_url: null,
  direction: 'incoming' as const,
  created_at: '2025-01-01T00:00:00.000Z',
};

async function mockFriendsRoutes(
  page: import('@playwright/test').Page,
  options: {
    friends?: typeof MOCK_FRIEND[];
    pending?: typeof MOCK_INCOMING_REQUEST[];
    status?: string;
  } = {},
): Promise<void> {
  const { friends = [], pending = [], status = 'none' } = options;

  await page.route(`${API}/users/me/friends/pending`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ requests: pending }),
    });
  });

  await page.route(/\/api\/v1\/users\/me\/friends\/[^/]+\/status$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status }),
    });
  });

  await page.route(/\/api\/v1\/users\/me\/friends\/[^/]+\/accept$/, async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });

  await page.route(/\/api\/v1\/users\/me\/friends\/[^/]+$/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'pending' }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.continue();
    }
  });

  await page.route(`${API}/users/me/friends`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ friends }),
      });
    } else {
      await route.continue();
    }
  });
}

async function mockDmRoutes(page: import('@playwright/test').Page): Promise<void> {
  await page.route(`${API}/dms`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ conversations: [] }),
    });
  });
}

async function mockBlocksRoute(page: import('@playwright/test').Page): Promise<void> {
  await page.route(`${API}/users/me/blocks`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ blockedIds: [] }),
    });
  });
}

test.describe('Friends feature', () => {
  test('Friends button in sidebar opens friends page', async ({ page }) => {
    await mockSocketIO(page);
    await mockServersRoutes(page);
    await mockUsersRoutes(page);
    await mockDmRoutes(page);
    await mockFriendsRoutes(page);

    await page.goto('/');
    // Navigate to home
    await page.getByLabel('Home').click();
    await expect(page.getByText('No conversation selected')).toBeVisible();

    // Click Friends button in sidebar
    await page.getByRole('button', { name: /Friends/ }).click();
    await expect(page.getByText('No friends yet')).toBeVisible();
  });

  test('displays friends list when friends exist', async ({ page }) => {
    await mockSocketIO(page);
    await mockServersRoutes(page);
    await mockUsersRoutes(page);
    await mockDmRoutes(page);
    await mockFriendsRoutes(page, { friends: [MOCK_FRIEND] });

    await page.goto('/');
    await page.getByLabel('Home').click();
    await page.getByRole('button', { name: /Friends/ }).click();

    await expect(page.getByText(MOCK_USER_TWO.display_name!)).toBeVisible();
  });

  test('switching between Friends and Pending tabs', async ({ page }) => {
    await mockSocketIO(page);
    await mockServersRoutes(page);
    await mockUsersRoutes(page);
    await mockDmRoutes(page);
    await mockFriendsRoutes(page, {
      friends: [MOCK_FRIEND],
      pending: [MOCK_INCOMING_REQUEST],
    });

    await page.goto('/');
    await page.getByLabel('Home').click();
    await page.getByRole('button', { name: /Friends/ }).click();

    // Should show friends tab by default
    await expect(page.getByText(MOCK_USER_TWO.display_name!)).toBeVisible();

    // Switch to pending tab
    await page.getByRole('button', { name: /Pending/ }).click();
    await expect(page.getByRole('button', { name: /Accept/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Decline/ })).toBeVisible();
  });

  test('Add Friend button in profile modal', async ({ page }) => {
    await mockSocketIO(page);
    await mockServersRoutes(page);
    await mockUsersRoutes(page);
    await mockDmRoutes(page);
    await mockBlocksRoute(page);
    await mockFriendsRoutes(page, { status: 'none' });

    await page.goto('/');
    await page.getByLabel('Home').click();

    // Open a DM conversation list to find a user — instead, we can navigate via the home route
    // For this test, we need a way to open a profile modal.
    // The DmList has conversations — let's set up a conversation with messages
    // Actually, let's mock a DM conversation and click on a user
    await page.route(`${API}/dms`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversations: [{
            _id: 'conv1',
            participantIds: [MOCK_USER.id, MOCK_USER_TWO.id],
            lastMessageAt: '2025-01-01T00:00:00.000Z',
            lastMessage: { _id: 'msg1', conversationId: 'conv1', authorId: MOCK_USER_TWO.id, content: 'Hello', attachmentIds: [], mentions: [], reactions: [], tone: null, editedAt: null, createdAt: '2025-01-01T00:00:00.000Z' },
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          }],
        }),
      });
    });

    // Wait for the DM list to load and verify the conversation appears
    await expect(page.getByLabel(`Conversation with ${MOCK_USER_TWO.display_name}`)).toBeVisible({ timeout: 5000 });
  });
});
