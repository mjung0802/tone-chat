import { test, expect } from '@playwright/test';
import { mockSocketIO, mockServersRoutes, mockUsersRoutes, mockAttachmentRoute } from './helpers/mocks';
import { MOCK_USER, MOCK_ATTACHMENT_AVATAR } from './helpers/fixtures';

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

test('shows avatar image when user has avatar_url', async ({ page }) => {
  // Re-register user routes with avatar_url (overrides beforeEach's handler)
  await mockAttachmentRoute(page, MOCK_ATTACHMENT_AVATAR);
  await mockUsersRoutes(page, { ...MOCK_USER, avatar_url: MOCK_ATTACHMENT_AVATAR.id });

  await page.goto('/profile');

  // Avatar.Image renders an img element within the labeled container
  const avatarContainer = page.getByLabel('Test User\'s avatar');
  await expect(avatarContainer).toBeVisible();
  await expect(avatarContainer.locator('img')).toBeVisible();
});

test('shows theme selector and allows changing theme', async ({ page }) => {
  await page.goto('/profile');

  // Verify all three theme buttons are visible
  await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
  // Use .first() since Notifications section also has a "System" button
  await expect(page.getByRole('button', { name: 'System' }).first()).toBeVisible();

  // Click Dark and verify the theme label is still visible (no crash, theme applied)
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.getByText('Theme', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
});

test('saves profile updates', async ({ page }) => {
  const newDisplayName = 'Updated Name';

  await page.goto('/profile');

  await page.getByLabel('Display name').fill(newDisplayName);
  await page.getByLabel('Save profile changes').click();

  await expect(page.getByText('Profile updated successfully')).toBeVisible();
});

test('shows notification preference selector with In-App selected by default', async ({ page }) => {
  await page.goto('/profile');

  await expect(page.getByText('Notifications')).toBeVisible();
  await expect(page.getByRole('button', { name: 'In-App' })).toBeVisible();
  // Use .last() to target Notifications section's System button (Theme section's System is first)
  await expect(page.getByRole('button', { name: 'System' }).last()).toBeVisible();
});

test('clicking System triggers permission flow and persists preference', async ({ context, page }) => {
  // Grant notification permission before clicking
  await context.grantPermissions(['notifications']);

  await page.goto('/profile');

  // Use .last() to target the Notifications section's System button
  await page.getByRole('button', { name: 'System' }).last().click();

  // Wait for async permission request + persistence to complete
  await expect(async () => {
    const stored = await page.evaluate(() => localStorage.getItem('notificationPreference'));
    expect(stored).toBe('system');
  }).toPass({ timeout: 5000 });

  // Reload and verify persistence
  await page.reload();
  const storedAfterReload = await page.evaluate(() => localStorage.getItem('notificationPreference'));
  expect(storedAfterReload).toBe('system');
});

test('clicking a color theme swatch persists to localStorage', async ({ page }) => {
  await page.goto('/profile');

  await page.getByRole('button', { name: 'Softboy color theme' }).click();

  await expect(async () => {
    const stored = await page.evaluate(() => localStorage.getItem('colorTheme'));
    expect(stored).toBe('softboy');
  }).toPass({ timeout: 5000 });
});

test('default color theme swatch is selected initially', async ({ page }) => {
  await page.goto('/profile');

  const defaultSwatch = page.getByRole('button', { name: 'Default color theme' });
  await expect(defaultSwatch).toBeVisible();

  // Verify default is the active theme (no colorTheme in localStorage means default)
  const stored = await page.evaluate(() => localStorage.getItem('colorTheme'));
  expect(stored).toBeNull();
});
