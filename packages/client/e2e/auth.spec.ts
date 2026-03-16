import { test, expect } from "@playwright/test";
import {
  mockAuthRoutes,
  mockSocketIO,
  mockServersRoutes,
  mockUsersRoutes,
} from "./helpers/mocks";

// All auth tests start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test("login with valid credentials shows servers screen", async ({ page }) => {
  await mockAuthRoutes(page);
  await mockSocketIO(page);
  await mockServersRoutes(page);

  await page.goto("/");

  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("password123");
  await page.getByLabel("Sign in").click();

  await expect(
    page.getByLabel("Test Server server, A test server"),
  ).toBeVisible();
});

test("login with invalid credentials shows error", async ({ page }) => {
  await mockAuthRoutes(page);
  await mockSocketIO(page);

  await page.goto("/");

  await page.getByLabel("Email address").fill("wrong@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("wrongpassword");
  await page.getByLabel("Sign in").click();

  // HelperText has accessibilityRole="alert"
  await expect(page.locator('[role="alert"]')).toBeVisible();
});

test("logout clears auth and returns to login", async ({ page }) => {
  await mockAuthRoutes(page);
  await mockSocketIO(page);
  await mockServersRoutes(page);
  await mockUsersRoutes(page);

  await page.goto("/");

  // Log in first
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("password123");
  await page.getByLabel("Sign in").click();
  await expect(
    page.getByLabel("Test Server server, A test server"),
  ).toBeVisible();

  // Navigate to profile then click logout
  await page.goto("/profile");
  await expect(page.getByLabel("Log out of your account")).toBeVisible();
  await page.getByLabel("Log out of your account").click();

  await expect(page.getByText("Welcome Back")).toBeVisible();
});
