import { expect, test } from "../fixtures/production-test.js";

test.describe("Guest navigation", () => {
  test("root route opens a valid public entry point", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/(?:login|vacancies)(?:[/?#]|$)/);
    await expect(page.locator("#app")).not.toBeEmpty();
  });

  test("protected vacancies route redirects a guest to login", async ({
    page
  }) => {
    await page.goto("/vacancies");

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(
      page.getByRole("heading", { name: "Вход", exact: true })
    ).toBeVisible();
  });

  test("unknown route shows the not found page", async ({ page }) => {
    await page.goto("/autotest-route-that-does-not-exist");

    await expect(page.getByText("Страница не найдена", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /На страницу входа|К вакансиям/ })
    ).toBeVisible();
  });
});
