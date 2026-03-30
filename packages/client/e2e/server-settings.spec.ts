import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
  mockChannelsRoutes,
  mockMembersRoutes,
  mockAttachmentRoute,
  mockInvitesRoutes,
  mockMessagesRoutes,
} from './helpers/mocks';
import { MOCK_ATTACHMENT_ICON, MOCK_MEMBERS, MOCK_SERVER } from './helpers/fixtures';

const NON_ADMIN_MEMBERS = [
  { ...MOCK_MEMBERS[0]!, role: 'member' },
];
const NON_ADMIN_SERVER = { ...MOCK_SERVER, ownerId: 'other-user' };

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockChannelsRoutes(page);
  await mockInvitesRoutes(page);
  await mockAttachmentRoute(page, MOCK_ATTACHMENT_ICON);
});

test('server settings page loads and shows server info', async ({ page }) => {
  await mockServersRoutes(page);
  await mockMembersRoutes(page);
  await page.goto(`/servers/${MOCK_SERVER._id}/settings`);

  await expect(page.getByText('Server Info')).toBeVisible();
  await expect(page.getByLabel('Server name')).toHaveValue(MOCK_SERVER.name);
});

test('server icon is visible on settings page', async ({ page }) => {
  await mockServersRoutes(page);
  await mockMembersRoutes(page);
  await page.goto(`/servers/${MOCK_SERVER._id}/settings`);

  // The settings page icon is inside the "Change server icon" pressable (owner view)
  const changeButton = page.getByLabel('Change server icon');
  await expect(changeButton).toBeVisible();
  await expect(changeButton.getByLabel(`${MOCK_SERVER.name} server icon`)).toBeVisible();
});

test('non-admin is redirected away from settings page', async ({ page }) => {
  await mockServersRoutes(page, [NON_ADMIN_SERVER]);
  await mockMembersRoutes(page, NON_ADMIN_MEMBERS);
  await page.goto(`/servers/${MOCK_SERVER._id}/settings`);

  // Non-admin should be redirected away — settings content should not be visible
  await expect(page.getByText('Server Info')).not.toBeVisible();
  await expect(page).not.toHaveURL(/settings/);
});

test('admin can see settings gear icon', async ({ page }) => {
  await mockServersRoutes(page);
  await mockMembersRoutes(page);
  await mockMessagesRoutes(page);
  await page.goto(`/servers/${MOCK_SERVER._id}`);

  await expect(page.getByLabel('Server settings')).toBeVisible();
});

test('non-admin cannot see settings gear icon', async ({ page }) => {
  await mockServersRoutes(page, [NON_ADMIN_SERVER]);
  await mockMembersRoutes(page, NON_ADMIN_MEMBERS);
  await mockMessagesRoutes(page);
  await page.goto(`/servers/${MOCK_SERVER._id}`);

  await expect(page.getByLabel('Server settings')).not.toBeVisible();
});
