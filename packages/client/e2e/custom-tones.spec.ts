import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockChannelsRoutes,
  mockMessagesRoutes,
  mockMembersRoutes,
  mockUsersRoutes,
  mockAttachmentRoute,
  mockInvitesRoutes,
  mockTonesRoutes,
} from './helpers/mocks';
import {
  MOCK_MESSAGES,
  MOCK_MEMBERS,
  MOCK_ATTACHMENT_ICON,
  MOCK_SERVER,
  MOCK_CUSTOM_TONE,
} from './helpers/fixtures';

const CHANNEL_URL = '/servers/server-001/channels/channel-001';
const SETTINGS_URL = `/servers/${MOCK_SERVER._id}/settings`;

test('admin can create a custom tone via settings', async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page, MOCK_MEMBERS);
  await mockInvitesRoutes(page);
  await mockAttachmentRoute(page, MOCK_ATTACHMENT_ICON);
  await mockTonesRoutes(page);

  await page.goto(SETTINGS_URL);

  // Wait for the Custom Tones section to be visible
  await expect(page.getByText('Custom Tones')).toBeVisible();

  // Fill in the tone key
  await page.getByLabel('Tone key').fill('silly');

  // Open emoji picker and select emoji
  await page.getByLabel('Pick tone emoji').click();
  await expect(page.getByTestId('emoji-picker-modal')).toBeVisible();
  await page.getByRole('button', { name: '🤪' }).click();

  // Modal should close
  await expect(page.getByTestId('emoji-picker-modal')).not.toBeVisible();

  // The emoji button should now show 🤪
  await expect(page.getByLabel('Pick tone emoji')).toContainText('🤪');

  // Fill remaining fields
  await page.getByLabel('Tone label').fill('Silly');
  await page.getByLabel('Light mode color').fill('#ff6b6b');
  await page.getByLabel('Dark mode color').fill('#ff8c8c');

  // Text style defaults to Normal — leave it or pick Italic
  await page.getByText('Italic', { exact: true }).click();

  // Submit the form
  await page.getByLabel('Add custom tone').click();

  // Wait for the new tone to appear as a list item
  await expect(page.getByText('🤪 /silly')).toBeVisible();
});

test('custom tone appears in TonePicker and can be used to send a message', async ({ page }) => {
  let capturedBody: unknown = null;

  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
  await mockTonesRoutes(page, [MOCK_CUSTOM_TONE]);

  // Custom messages route to capture POST body
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
        capturedBody = route.request().postDataJSON();
        const body = capturedBody as { content?: string; tone?: string };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              _id: 'msg-tone-sent',
              channelId: 'channel-001',
              serverId: 'server-001',
              authorId: 'user-001',
              content: body.content ?? '',
              attachmentIds: [],
              reactions: [],
              tone: body.tone,
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

  // Open tone picker
  await page.getByLabel('Select tone').click();

  // Custom tone chip should be visible
  const sillyChip = page.getByLabel('Silly tone');
  await expect(sillyChip).toBeVisible();

  // Select the custom tone
  await sillyChip.click();

  // Tone preview should appear
  await expect(page.getByText('Silly')).toBeVisible();

  // Type and send a message
  await page.getByLabel('Message input').fill('Testing custom tone');
  await page.getByLabel('Send message').click();

  // Verify message appears
  await expect(page.getByText('Testing custom tone')).toBeVisible();

  // Verify the POST body included tone
  expect(capturedBody).toBeTruthy();
  expect((capturedBody as { tone?: string }).tone).toBe('silly');
});

test('message displays with custom tone styling', async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
  await mockTonesRoutes(page, [MOCK_CUSTOM_TONE]);

  const messagesWithTone = [
    ...MOCK_MESSAGES,
    {
      _id: 'msg-with-tone',
      channelId: 'channel-001',
      serverId: 'server-001',
      authorId: 'user-001',
      content: 'This message has a tone',
      attachmentIds: [],
      reactions: [],
      tone: 'silly',
      createdAt: '2024-01-01T00:05:00.000Z',
    },
  ];

  await mockMessagesRoutes(page, messagesWithTone);

  await page.goto(CHANNEL_URL);

  // The message with tone should have accessible label containing ", tone: Silly"
  const tonedMessage = page.getByLabel(/, tone: Silly/);
  await expect(tonedMessage).toBeVisible();
});

test('TonePicker shows base tones alongside custom tones', async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
  await mockMessagesRoutes(page);
  await mockTonesRoutes(page, [MOCK_CUSTOM_TONE]);

  await page.goto(CHANNEL_URL);

  // Open the tone picker
  await page.getByLabel('Select tone').click();

  // Base tones should be visible
  await expect(page.getByLabel('joking tone', { exact: true })).toBeVisible();
  await expect(page.getByLabel('sarcasm tone', { exact: true })).toBeVisible();
  await expect(page.getByLabel('serious tone', { exact: true })).toBeVisible();

  // Custom tone should also appear
  await expect(page.getByLabel('Silly tone', { exact: true })).toBeVisible();
});

test('selecting a tone in TonePicker, sending, and rendering the message bubble', async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
  await mockTonesRoutes(page, []);

  // Custom messages route to capture POST and echo tone back in the response
  await page.route(
    /http:\/\/localhost:4000\/api\/v1\/servers\/[^/]+\/channels\/[^/]+\/messages(\?.*)?$/,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as { content?: string; tone?: string };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              _id: 'msg-picker-tone',
              channelId: 'channel-001',
              serverId: 'server-001',
              authorId: 'user-001',
              content: body.content ?? '',
              attachmentIds: [],
              reactions: [],
              tone: body.tone,
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

  // Open picker, pick base "sarcasm" tone, type, send.
  await page.getByLabel('Select tone').click();
  await page.getByLabel('sarcasm tone', { exact: true }).click();
  await page.getByLabel('Message input').fill('did not see that coming');
  await page.getByLabel('Send message').click();

  // Bubble should render with the sarcasm tone label embedded in its aria-label.
  await expect(page.getByLabel(/tone: sarcasm/)).toBeVisible();
  await expect(page.getByText('did not see that coming', { exact: true })).toBeVisible();
});
