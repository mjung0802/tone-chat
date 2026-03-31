import { test, expect } from '@playwright/test';
import {
  mockUnverifiedLoginRoute,
  mockVerifyEmailRoute,
  mockResendVerificationRoute,
  mockSocketIO,
  mockServersRoutes,
  seedActiveInstance,
} from './helpers/mocks';

// All tests use unauthenticated context
test.use({ storageState: { cookies: [], origins: [] } });

const API = 'http://localhost:4000/api/v1';

/** Navigate to verify-email screen by logging in with an unverified account. */
async function gotoVerifyEmailScreen(page: Parameters<typeof mockUnverifiedLoginRoute>[0]) {
  await mockUnverifiedLoginRoute(page);
  await mockVerifyEmailRoute(page);
  await mockResendVerificationRoute(page);
  await mockSocketIO(page);

  // /users/me is called by verify-email screen to display the email
  await page.route(`${API}/users/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user-001',
          username: 'testuser',
          email: 'unverified@example.com',
          email_verified: false,
          display_name: 'Test User',
          pronouns: null,
          avatar_url: null,
          bio: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      }),
    });
  });

  await seedActiveInstance(page);
  await page.goto('/');
  await page.getByLabel('Email address').fill('unverified@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByLabel('Sign in').click();
}

test('login with unverified account shows verify-email screen', async ({ page }) => {
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();
  await expect(page.getByText(/unverified@example\.com/)).toBeVisible();
});

test('enter valid code redirects to servers screen', async ({ page }) => {
  await mockServersRoutes(page);
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();

  await page.getByLabel('6-digit verification code').fill('123456');
  await page.getByLabel('Verify email').click();

  await expect(page.getByLabel('Test Server server, A test server')).toBeVisible({ timeout: 10_000 });
});

test('enter invalid code shows error message', async ({ page }) => {
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();

  await page.getByLabel('6-digit verification code').fill('000000');
  await page.getByLabel('Verify email').click();

  await expect(page.locator('[role="alert"]')).toContainText(/invalid/i);
});

test('verify button disabled until 6 digits entered', async ({ page }) => {
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();

  const verifyButton = page.getByLabel('Verify email');

  // Disabled with 0 chars
  await expect(verifyButton).toBeDisabled();

  // Disabled with 5 chars
  await page.getByLabel('6-digit verification code').fill('12345');
  await expect(verifyButton).toBeDisabled();

  // Enabled with 6 chars
  await page.getByLabel('6-digit verification code').fill('123456');
  await expect(verifyButton).toBeEnabled();
});

test('code input strips non-digit characters', async ({ page }) => {
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();

  const input = page.getByLabel('6-digit verification code');
  await input.fill('abc123');

  // Only the digits '123' should remain
  await expect(input).toHaveValue('123');
});

test('resend button starts cooldown and becomes disabled after click', async ({ page }) => {
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();

  const resendButton = page.getByLabel('Resend verification code');
  await resendButton.click();

  // After click, button should show cooldown label and be disabled
  await expect(page.getByLabel(/Resend code available in \d+ seconds/)).toBeDisabled();
});

test('expired code shows CODE_EXPIRED error', async ({ page }) => {
  await gotoVerifyEmailScreen(page);

  await expect(page.getByText('Verify Your Email')).toBeVisible();

  // 'expired' triggers CODE_EXPIRED in the mock (but only 6 chars accepted — use digits)
  // The mock returns CODE_EXPIRED for code === 'expired', but the input only accepts digits.
  // Override the mock to return CODE_EXPIRED for a specific numeric code.
  await page.unroute(`${API}/auth/verify-email`);
  await page.route(`${API}/auth/verify-email`, async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'CODE_EXPIRED', message: 'Verification code has expired', status: 400 } }),
    });
  });

  await page.getByLabel('6-digit verification code').fill('111111');
  await page.getByLabel('Verify email').click();

  await expect(page.locator('[role="alert"]')).toContainText(/expired/i);
});
