import { test, expect } from '@playwright/test';
import { mockSocketIO, mockServersRoutes, mockChannelsRoutes, mockUsersRoutes, mockJoinViaCodeRoute, mockMessagesRoutes } from './helpers/mocks';
import { MOCK_CHANNEL, MOCK_SERVER, MOCK_SERVER_TWO, MOCK_CHANNEL_TWO, MOCK_CHANNEL_SECONDARY } from './helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
});

test('shows server list when servers exist', async ({ page }) => {
  await mockServersRoutes(page);

  await page.goto('/');

  await expect(page.getByLabel('Test Server server, A test server')).toBeVisible();
});

test('shows empty state when no servers', async ({ page }) => {
  await mockServersRoutes(page, []);

  await page.goto('/');

  await expect(page.getByText('No servers yet')).toBeVisible();
});

test('navigates to channel view on server press', async ({ page }) => {
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);

  await page.goto('/');

  // Click the server list item (not the sidebar icon)
  await page.getByRole('button', { name: 'Test Server server, A test server' }).click();

  await expect(page.getByText(MOCK_CHANNEL.name)).toBeVisible();
});

test('join server dialog accepts invite code and navigates to server', async ({ page }) => {
  await mockServersRoutes(page);
  await mockChannelsRoutes(page);
  await mockJoinViaCodeRoute(page);

  await page.goto('/');

  // Open the join server dialog
  await page.getByRole('button', { name: 'Join server via invite code' }).click();

  // Fill in the invite code and submit
  await page.getByRole('textbox', { name: 'Invite code' }).fill('test-invite-code');
  await page.getByRole('button', { name: 'Join server', exact: true }).click();

  // Should navigate to the joined server's channel view
  await expect(page.getByText(MOCK_CHANNEL.name)).toBeVisible();
});

test('returns to last viewed channel when switching back to a server', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER, MOCK_SERVER_TWO]);
  await mockChannelsRoutes(
    page,
    [MOCK_CHANNEL, MOCK_CHANNEL_SECONDARY, MOCK_CHANNEL_TWO],
    {
      'server-001': [MOCK_CHANNEL, MOCK_CHANNEL_SECONDARY],
      'server-002': [MOCK_CHANNEL_TWO],
    },
  );
  await mockMessagesRoutes(page);

  await page.goto('/');

  // Navigate into server 1 — lands on first channel (#general)
  await page.getByRole('button', { name: 'Test Server server, A test server' }).click();
  await expect(page).toHaveURL(new RegExp(MOCK_CHANNEL._id));

  // Navigate to the secondary channel (#off-topic)
  await page.getByRole('button', { name: `text channel ${MOCK_CHANNEL_SECONDARY.name}` }).click();
  expect(page.url()).toContain(MOCK_CHANNEL_SECONDARY._id);

  // Switch to server 2 via the rail
  await page.getByRole('button', { name: `${MOCK_SERVER_TWO.name} server` }).click();
  await expect(page.getByText(MOCK_CHANNEL_TWO.name)).toBeVisible();

  // Switch back to server 1 via the rail — should land on #off-topic, not #general
  await page.getByRole('button', { name: `${MOCK_SERVER.name} server` }).click();
  expect(page.url()).toContain(MOCK_CHANNEL_SECONDARY._id);
});

test('channel drawer updates when switching servers via rail', async ({ page }) => {
  await mockServersRoutes(page, [MOCK_SERVER, MOCK_SERVER_TWO]);
  await mockChannelsRoutes(
    page,
    [MOCK_CHANNEL, MOCK_CHANNEL_TWO],
    { 'server-001': [MOCK_CHANNEL], 'server-002': [MOCK_CHANNEL_TWO] },
  );

  await page.goto('/');

  // Navigate to server 1 via the server list
  await page.getByRole('button', { name: 'Test Server server, A test server' }).click();
  await expect(page.getByText(MOCK_CHANNEL.name)).toBeVisible();

  // Switch to server 2 via the server rail icon
  await page.getByRole('button', { name: `${MOCK_SERVER_TWO.name} server` }).click();

  // Channel drawer must update to show server 2's channel
  await expect(page.getByText(MOCK_CHANNEL_TWO.name)).toBeVisible();
});
