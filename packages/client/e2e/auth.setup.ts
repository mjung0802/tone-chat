import { test as setup, expect } from "@playwright/test";
import {
  mockAuthRoutes,
  mockSocketIO,
  mockServersRoutes,
} from "./helpers/mocks";

setup("authenticate", async ({ page }) => {
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

  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
