import { test, expect } from "@playwright/test";
import {
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
  mockAttachmentRoute,
} from "./helpers/mocks";
import { MOCK_USER, MOCK_ATTACHMENT_AVATAR } from "./helpers/fixtures";

test.beforeEach(async ({ page }) => {
  await mockSocketIO(page);
  await mockServersRoutes(page);
  await mockUsersRoutes(page);
});

test("shows user profile data", async ({ page }) => {
  await page.goto("/profile");

  await expect(page.getByText(MOCK_USER.username)).toBeVisible();
  await expect(page.getByText(MOCK_USER.email)).toBeVisible();
});

test("shows avatar image when user has avatar_url", async ({ page }) => {
  // Re-register user routes with avatar_url (overrides beforeEach's handler)
  await mockAttachmentRoute(page, MOCK_ATTACHMENT_AVATAR);
  await mockUsersRoutes(page, {
    ...MOCK_USER,
    avatar_url: MOCK_ATTACHMENT_AVATAR.id,
  });

  await page.goto("/profile");

  // Avatar.Image renders an img element within the labeled container
  const avatarContainer = page.getByLabel("Test User's avatar");
  await expect(avatarContainer).toBeVisible();
  await expect(avatarContainer.locator("img")).toBeVisible();
});

test("saves profile updates", async ({ page }) => {
  const newDisplayName = "Updated Name";

  await page.goto("/profile");

  await page.getByLabel("Display name").fill(newDisplayName);
  await page.getByLabel("Save profile changes").click();

  await expect(page.getByText("Profile updated successfully")).toBeVisible();
});
