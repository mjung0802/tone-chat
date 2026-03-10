import { test, expect } from '@playwright/test';
import { mockSocketIO, mockServersRoutes, mockUsersRoutes } from './helpers/mocks';
import { MOCK_USER } from './helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockServersRoutes(page);
  await mockUsersRoutes(page);
});

test('shows user profile data', async ({ page }) => {
  await page.goto('/profile');

  await expect(page.getByText(MOCK_USER.username)).toBeVisible();
  await expect(page.getByText(MOCK_USER.email)).toBeVisible();
});

test('saves profile updates', async ({ page }) => {
  const newDisplayName = 'Updated Name';

  await page.goto('/profile');

  await page.getByLabel('Display name').fill(newDisplayName);
  await page.getByLabel('Save profile changes').click();

  await expect(page.getByText('Profile updated successfully')).toBeVisible();
});
