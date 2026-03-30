import { test, expect } from '@playwright/test';

// Connect screen tests run without any stored auth or instance state
test.use({ storageState: { cookies: [], origins: [] } });

const HEALTH_URL = 'http://localhost:4000/api/v1/health';
const INSTANCE_URL = 'http://localhost:4000';

test('connect button is disabled when URL input is empty', async ({ page }) => {
  await page.goto('/connect');

  const connectButton = page.getByLabel('Connect to server');
  await expect(connectButton).toBeDisabled();
});

test('failed health check shows error message', async ({ page }) => {
  await page.route(HEALTH_URL, (route) => route.abort('failed'));

  await page.goto('/connect');
  await page.getByLabel('Server URL').fill(INSTANCE_URL);
  await page.getByLabel('Connect to server').click();

  await expect(page.locator('[role="alert"]')).toBeVisible();
  await expect(page.locator('[role="alert"]')).toContainText('Could not connect');
});

test('non-200 health response shows error message', async ({ page }) => {
  await page.route(HEALTH_URL, (route) =>
    route.fulfill({ status: 503, body: 'Service Unavailable' }),
  );

  await page.goto('/connect');
  await page.getByLabel('Server URL').fill(INSTANCE_URL);
  await page.getByLabel('Connect to server').click();

  await expect(page.locator('[role="alert"]')).toBeVisible();
  await expect(page.locator('[role="alert"]')).toContainText('Could not connect');
});

test('successful health check navigates to login', async ({ page }) => {
  await page.route(HEALTH_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, version: '1.0.0' }),
    }),
  );

  await page.goto('/connect');
  await page.getByLabel('Server URL').fill(INSTANCE_URL);
  await page.getByLabel('Connect to server').click();

  await expect(page.getByText('Welcome Back')).toBeVisible();
});

test('trailing slash in URL is stripped before health check', async ({ page }) => {
  let interceptedUrl = '';
  await page.route('**/_health_*', () => {});
  await page.route(`${INSTANCE_URL}/api/v1/health`, (route) => {
    interceptedUrl = route.request().url();
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, version: '1.0.0' }),
    });
  });

  await page.goto('/connect');
  await page.getByLabel('Server URL').fill(`${INSTANCE_URL}/`);
  await page.getByLabel('Connect to server').click();

  await expect(page.getByText('Welcome Back')).toBeVisible();
  expect(interceptedUrl).toBe(`${INSTANCE_URL}/api/v1/health`);
});

test('error message clears when URL is edited', async ({ page }) => {
  await page.route(HEALTH_URL, (route) => route.abort('failed'));

  await page.goto('/connect');
  await page.getByLabel('Server URL').fill(INSTANCE_URL);
  await page.getByLabel('Connect to server').click();
  await expect(page.locator('[role="alert"]')).toBeVisible();

  // Edit the URL — error should disappear
  await page.getByLabel('Server URL').fill(`${INSTANCE_URL}/extra`);
  await expect(page.locator('[role="alert"]')).not.toBeVisible();
});

test('saved servers are shown and clicking one navigates to login', async ({ page }) => {
  // Seed localStorage with a saved instance before loading the page
  await page.addInitScript(() => {
    localStorage.setItem('instances', JSON.stringify(['http://saved.example.com']));
    // No activeInstance — so connect screen is shown
  });

  await page.goto('/connect');

  await expect(page.getByText('Saved Servers')).toBeVisible();
  const savedRow = page.getByLabel('Connect to http://saved.example.com');
  await expect(savedRow).toBeVisible();

  // Mock health for the saved instance URL (instanceStore sets it as active on click)
  await page.route('http://saved.example.com/api/v1/*', (route) => route.abort());

  await savedRow.click();

  // Unauthenticated → redirected to login
  await expect(page.getByText('Welcome Back')).toBeVisible();
});
