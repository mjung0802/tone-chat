import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMembersRoutes,
  mockUsersRoutes,
} from './helpers/mocks';
import { MOCK_MESSAGES, MOCK_USER } from './helpers/fixtures';

const CHANNEL_URL = '/servers/server-001/channels/channel-001';
const API = 'http://localhost:4000/api/v1';

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
});

async function mockMessageRoutesFull(page: Parameters<typeof mockSocketIO>[0]) {
  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: MOCK_MESSAGES }),
        });
      } else {
        await route.continue();
      }
    },
  );
}

test('hover own message shows pencil and trash-can buttons', async ({ page }) => {
  await mockMessageRoutesFull(page);
  await page.goto(CHANNEL_URL);

  // MOCK_MESSAGES[0] has authorId: 'user-001' — same as current user
  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();

  await expect(page.getByTestId('hover-edit-button')).toBeVisible();
  await expect(page.getByTestId('hover-delete-button')).toBeVisible();
});

test('inline edit: clicking pencil shows pre-filled TextInput and Cancel restores view', async ({ page }) => {
  await mockMessageRoutesFull(page);
  await page.goto(CHANNEL_URL);

  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();
  await page.getByTestId('hover-edit-button').click();

  // TextInput should appear with original content
  const input = page.getByLabel('Edit message content');
  await expect(input).toBeVisible();
  await expect(input).toHaveValue(MOCK_MESSAGES[0]!.content);

  // Cancel restores normal view
  await page.getByLabel('Cancel edit').click();
  await expect(input).not.toBeVisible();
  await expect(page.getByText(MOCK_MESSAGES[0]!.content)).toBeVisible();
});

test('inline edit: Save sends PATCH and updates bubble', async ({ page }) => {
  const editedContent = 'Edited message content';

  await mockMessageRoutesFull(page);

  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages\/[^/]+$/,
    async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              ...MOCK_MESSAGES[0],
              content: editedContent,
              editedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    },
  );

  await page.goto(CHANNEL_URL);

  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();
  await page.getByTestId('hover-edit-button').click();

  const input = page.getByLabel('Edit message content');
  await input.clear();
  await input.fill(editedContent);
  await page.getByLabel('Save edit').click();

  await expect(page.getByText(editedContent)).toBeVisible();
});

test('delete: clicking trash-can shows confirmation dialog and Cancel dismisses', async ({ page }) => {
  await mockMessageRoutesFull(page);
  await page.goto(CHANNEL_URL);

  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();
  await page.getByTestId('hover-delete-button').click();

  await expect(page.getByText('Delete this message?')).toBeVisible();

  await page.getByLabel('Cancel delete').click();
  await expect(page.getByText('Delete this message?')).not.toBeVisible();
  await expect(page.getByText(MOCK_MESSAGES[0]!.content)).toBeVisible();
});

test('delete: confirming DELETE removes message from chat', async ({ page }) => {
  await mockMessageRoutesFull(page);

  await page.route(
    new RegExp(`${API}/servers/[^/]+/channels/[^/]+/messages/${MOCK_MESSAGES[0]!._id}$`),
    async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    },
  );

  await page.goto(CHANNEL_URL);

  const messageContainer = page.getByLabel(
    `${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`,
    { exact: false },
  );
  await messageContainer.hover();
  await page.getByTestId('hover-delete-button').click();
  await page.getByLabel('Confirm delete').click();

  await expect(page.getByText(MOCK_MESSAGES[0]!.content)).not.toBeVisible();
});
