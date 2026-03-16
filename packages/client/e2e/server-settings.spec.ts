import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
  mockChannelsRoutes,
  mockMembersRoutes,
  mockAttachmentRoute,
  mockInvitesRoutes,
} from './helpers/mocks';
import { MOCK_ATTACHMENT_ICON, MOCK_SERVER } from './helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockChannelsRoutes(page);
  await mockMembersRoutes(page);
  await mockInvitesRoutes(page);
  await mockAttachmentRoute(page, MOCK_ATTACHMENT_ICON);
});

test('server settings page loads and shows server info', async ({ page }) => {
  await mockServersRoutes(page);
  await page.goto(`/servers/${MOCK_SERVER._id}/settings`);

  await expect(page.getByText('Server Info')).toBeVisible();
  await expect(page.getByLabel('Server name')).toHaveValue(MOCK_SERVER.name);
});

test('server icon is visible on settings page', async ({ page }) => {
  await mockServersRoutes(page);
  await page.goto(`/servers/${MOCK_SERVER._id}/settings`);

  // The settings page icon is inside the "Change server icon" pressable (owner view)
  const changeButton = page.getByLabel('Change server icon');
  await expect(changeButton).toBeVisible();
  await expect(changeButton.getByLabel(`${MOCK_SERVER.name} server icon`)).toBeVisible();
});

test('non-owner does not see camera overlay', async ({ page }) => {
  const otherOwnerServer = { ...MOCK_SERVER, ownerId: 'other-user-id' };
  await mockServersRoutes(page, [otherOwnerServer]);
  await page.goto(`/servers/${otherOwnerServer._id}/settings`);

  // Use .first() since sidebar also renders a ServerIcon
  const iconElement = page.getByLabel(`${MOCK_SERVER.name} server icon`).first();
  await expect(iconElement).toBeVisible();
  await expect(page.getByLabel('Change server icon')).not.toBeVisible();
});
