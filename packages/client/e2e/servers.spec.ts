import { test, expect } from '@playwright/test';
import { mockSocketIO, mockServersRoutes, mockChannelsRoutes, mockUsersRoutes } from './helpers/mocks';
import { MOCK_CHANNEL } from './helpers/fixtures';

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
