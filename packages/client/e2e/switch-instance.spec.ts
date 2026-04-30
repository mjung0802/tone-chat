import { test, expect } from '@playwright/test';
import {
  mockAuthRoutes,
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
} from './helpers/mocks';

// These tests log in fresh inside each test so we can also assert per-instance
// localStorage keys before and after the switch.
test.use({ storageState: { cookies: [], origins: [] } });

const INSTANCE_A = 'http://localhost:4000';
const INSTANCE_B = 'http://chat.example.test';

async function loginOnInstanceA(page: import('@playwright/test').Page): Promise<void> {
  await mockAuthRoutes(page);
  await mockSocketIO(page);
  await mockServersRoutes(page);
  await mockUsersRoutes(page);

  await page.addInitScript(() => {
    localStorage.setItem('activeInstance', 'http://localhost:4000');
    localStorage.setItem('instances', JSON.stringify(['http://localhost:4000']));
  });

  await page.goto('/');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByLabel('Sign in').click();
  await expect(page.getByLabel('Test Server server, A test server')).toBeVisible();
}

test('Profile screen shows the connected instance URL', async ({ page }) => {
  await loginOnInstanceA(page);

  await page.goto('/profile');

  await expect(page.getByText(`Connected to ${INSTANCE_A}`)).toBeVisible();
});

test('Switch Instance from Profile returns to /connect with the saved instance listed', async ({ page }) => {
  await loginOnInstanceA(page);

  await page.goto('/profile');
  await page.getByLabel('Switch to a different Tone server').click();

  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByText('Saved Servers')).toBeVisible();
  await expect(page.getByLabel(`Connect to ${INSTANCE_A}`)).toBeVisible();
});

test('Switch Instance preserves the per-instance access token in localStorage', async ({ page }) => {
  await loginOnInstanceA(page);

  // Snapshot the per-instance access token after login
  const tokenBefore = await page.evaluate(
    (key) => localStorage.getItem(key),
    `accessToken:${INSTANCE_A}`,
  );
  expect(tokenBefore).not.toBeNull();

  await page.goto('/profile');
  await page.getByLabel('Switch to a different Tone server').click();

  await expect(page).toHaveURL(/\/connect$/);

  const tokenAfter = await page.evaluate(
    (key) => localStorage.getItem(key),
    `accessToken:${INSTANCE_A}`,
  );
  expect(tokenAfter).toBe(tokenBefore);
});

test('Switch Instance from ServerRail navigates back to /connect', async ({ page }) => {
  await loginOnInstanceA(page);

  // ServerRail is rendered in the main layout — click the switch icon directly
  await page.getByLabel('Switch instance').click();

  await expect(page).toHaveURL(/\/connect$/);
});

test('Switch Instance from login screen navigates back to /connect', async ({ page }) => {
  await mockAuthRoutes(page);
  await mockSocketIO(page);

  // Seed two saved instances, A active — confirms both remain after the switch
  await page.addInitScript(
    ({ a, b }: { a: string; b: string }) => {
      localStorage.setItem('activeInstance', a);
      localStorage.setItem('instances', JSON.stringify([a, b]));
    },
    { a: INSTANCE_A, b: INSTANCE_B },
  );

  // Root layout redirects unauthenticated users with an active instance to /(auth)/login
  await page.goto('/');
  await expect(page.getByText('Welcome Back')).toBeVisible();

  await page.getByLabel('Switch to a different Tone server').click();

  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByLabel(`Connect to ${INSTANCE_A}`)).toBeVisible();
  await expect(page.getByLabel(`Connect to ${INSTANCE_B}`)).toBeVisible();
});

test('Switch Instance from register screen navigates back to /connect', async ({ page }) => {
  await mockAuthRoutes(page);
  await mockSocketIO(page);

  await page.addInitScript(
    ({ a, b }: { a: string; b: string }) => {
      localStorage.setItem('activeInstance', a);
      localStorage.setItem('instances', JSON.stringify([a, b]));
    },
    { a: INSTANCE_A, b: INSTANCE_B },
  );

  // Reach register via the "Sign Up" link on login — URL convention agnostic
  await page.goto('/');
  await expect(page.getByText('Welcome Back')).toBeVisible();
  await page.getByLabel('Create account').click();
  // Username field is only present on register, disambiguates from login
  await expect(page.getByLabel('Username')).toBeVisible();

  // Both auth screens stay mounted in the Stack — the register screen is the
  // visible/active one, so click the last (most recent) Switch Instance button.
  await page.getByLabel('Switch to a different Tone server').last().click();

  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByLabel(`Connect to ${INSTANCE_A}`)).toBeVisible();
  await expect(page.getByLabel(`Connect to ${INSTANCE_B}`)).toBeVisible();
});

test('multi-instance: both saved instances remain in the list after switching', async ({ page }) => {
  await mockAuthRoutes(page);
  await mockSocketIO(page);
  await mockServersRoutes(page);
  await mockUsersRoutes(page);

  // Seed two saved instances, A active
  await page.addInitScript(
    ({ a, b }: { a: string; b: string }) => {
      localStorage.setItem('activeInstance', a);
      localStorage.setItem('instances', JSON.stringify([a, b]));
    },
    { a: INSTANCE_A, b: INSTANCE_B },
  );

  await page.goto('/');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByLabel('Sign in').click();
  await expect(page.getByLabel('Test Server server, A test server')).toBeVisible();

  await page.goto('/profile');
  await page.getByLabel('Switch to a different Tone server').click();

  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByLabel(`Connect to ${INSTANCE_A}`)).toBeVisible();
  await expect(page.getByLabel(`Connect to ${INSTANCE_B}`)).toBeVisible();

  const stored = await page.evaluate(() => localStorage.getItem('instances'));
  expect(stored).toBe(JSON.stringify([INSTANCE_A, INSTANCE_B]));
  const active = await page.evaluate(() => localStorage.getItem('activeInstance'));
  expect(active).toBeNull();
});
