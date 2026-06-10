import { test as setup, expect } from "@playwright/test";

import {
  authFile,
  hasCredentials,
  testEmail,
  testPassword
} from "./support/env.js";

setup("authenticate production test account", async ({ page }) => {
  setup.skip(
    !hasCredentials,
    "SPAIRON_TEST_EMAIL and SPAIRON_TEST_PASSWORD are not configured"
  );

  await page.goto("/login");
  await page.locator("#login-email").fill(testEmail);
  await page.locator("#login-password").fill(testPassword);
  await page.getByRole("button", { name: "Войти", exact: true }).click();

  await expect(page).toHaveURL(/\/vacancies(?:[/?#]|$)/);
  await expect(
    page.getByRole("heading", { name: /Вакансии|Мои вакансии/ })
  ).toBeVisible();

  await page.context().storageState({ path: authFile });
});
