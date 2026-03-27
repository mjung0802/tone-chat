import { test, expect } from '@playwright/test';
import {
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
  mockChannelsRoutes,
  mockMembersRoutes,
  mockInvitesRoutes,
  mockAuditLogRoutes,
} from './helpers/mocks';
import { MOCK_MEMBERS, MOCK_SERVER } from './helpers/fixtures';

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockUsersRoutes(page);
  await mockChannelsRoutes(page);
  await mockInvitesRoutes(page);
  await mockServersRoutes(page);
  await mockMembersRoutes(page);
  await mockAuditLogRoutes(page);
});

test('audit log screen loads and displays entries', async ({ page }) => {
  await page.goto(`/servers/${MOCK_SERVER._id}/audit-log`);

  await expect(page.getByText('Audit Log').first()).toBeVisible();
  await expect(page.getByText(/banned/)).toBeVisible();
  await expect(page.getByText(/muted/)).toBeVisible();
  await expect(page.getByText(/promoted/)).toBeVisible();
});

test('audit log shows ban reason', async ({ page }) => {
  await page.goto(`/servers/${MOCK_SERVER._id}/audit-log`);

  await expect(page.getByText(/Reason: Spamming channels/)).toBeVisible();
});

test('audit log shows mute duration', async ({ page }) => {
  await page.goto(`/servers/${MOCK_SERVER._id}/audit-log`);

  await expect(page.getByText(/Duration: 1 hour/)).toBeVisible();
});

test('audit log shows role change', async ({ page }) => {
  await page.goto(`/servers/${MOCK_SERVER._id}/audit-log`);

  await expect(page.getByText(/member → mod/)).toBeVisible();
});

test('audit log is navigable from settings', async ({ page }) => {
  await page.goto(`/servers/${MOCK_SERVER._id}/settings`);

  const auditLogButton = page.getByLabel('View audit log');
  await expect(auditLogButton).toBeVisible();
  await auditLogButton.click();

  await expect(page).toHaveURL(/audit-log/);
  await expect(page.getByText(/banned/)).toBeVisible();
});

test('non-admin cannot access audit log', async ({ page }) => {
  const NON_ADMIN_MEMBERS = [{ ...MOCK_MEMBERS[0]!, role: 'member' }];
  const NON_ADMIN_SERVER = { ...MOCK_SERVER, ownerId: 'other-user' };
  await mockServersRoutes(page, [NON_ADMIN_SERVER]);
  await mockMembersRoutes(page, NON_ADMIN_MEMBERS);

  await page.goto(`/servers/${MOCK_SERVER._id}/audit-log`);

  await expect(page.getByText('Audit Log')).not.toBeVisible();
});

test('audit log shows empty state when no entries', async ({ page }) => {
  await mockAuditLogRoutes(page, []);

  await page.goto(`/servers/${MOCK_SERVER._id}/audit-log`);

  await expect(page.getByText('No entries')).toBeVisible();
});
