import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMessagesRoutes,
  mockMembersRoutes,
} from './helpers/mocks';
import { MOCK_MESSAGES, MOCK_USER } from './helpers/fixtures';

const CHANNEL_URL = '/servers/server-001/channels/channel-001';

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
});

test('displays messages in channel', async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  await expect(page.getByText(MOCK_MESSAGES[0]!.content)).toBeVisible();
  await expect(page.getByText(MOCK_MESSAGES[1]!.content)).toBeVisible();
});

test('sends a text message and it appears in the list', async ({ page }) => {
  const sentContent = 'This is a new E2E test message';

  // Handle both GET (existing messages) and POST (new message) in one handler
  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: MOCK_MESSAGES }),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { content?: string };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              _id: 'msg-sent',
              channelId: 'channel-001',
              serverId: 'server-001',
              authorId: 'user-001',
              content: body.content ?? '',
              attachmentIds: [],
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    },
  );

  await page.goto(CHANNEL_URL);

  await page.getByLabel('Message input').fill(sentContent);
  await page.getByLabel('Send message').click();

  await expect(page.getByText(sentContent)).toBeVisible();
});

test('displays existing reaction chips on messages', async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  // First message has reactions, verify chips are visible
  await expect(page.getByTestId('reaction-chip-👍')).toBeVisible();
  await expect(page.getByTestId('reaction-chip-🔥')).toBeVisible();
});

test('hover shows add-reaction button', async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  // Hover over the first message
  const messageContainer = page.getByLabel(`${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`, { exact: false });
  await messageContainer.hover();

  await expect(messageContainer.getByTestId('hover-reaction-button')).toBeVisible();
});

test('click add-reaction opens emoji picker', async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  const messageContainer = page.getByLabel(`${MOCK_USER.display_name} said: ${MOCK_MESSAGES[0]!.content}`, { exact: false });
  await messageContainer.hover();

  await messageContainer.getByTestId('hover-reaction-button').click();

  await expect(page.getByTestId('emoji-picker-modal')).toBeVisible();
});

test('send button is disabled while message is empty', async ({ page }) => {
  await mockMessagesRoutes(page);

  await page.goto(CHANNEL_URL);

  // Without any input text, send button should be disabled
  const sendButton = page.getByLabel('Send message');
  await expect(sendButton).toBeDisabled();

  // After typing, send button becomes enabled
  await page.getByLabel('Message input').fill('hello');
  await expect(sendButton).toBeEnabled();
});
