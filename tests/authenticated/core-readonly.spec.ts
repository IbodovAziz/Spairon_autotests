import { expect, test } from "../fixtures/production-test.js";
import {
  apiUrl,
  hasCredentials,
  testVacancyId
} from "../support/env.js";

test.describe("Authenticated read-only smoke", () => {
  test.skip(
    !hasCredentials,
    "SPAIRON_TEST_EMAIL and SPAIRON_TEST_PASSWORD are not configured"
  );

  test("vacancies page loads for the test account", async ({ page }) => {
    await page.goto("/vacancies");

    await expect(page).toHaveURL(/\/vacancies(?:[/?#]|$)/);
    await expect(
      page.getByRole("heading", { name: /Вакансии|Мои вакансии/ })
    ).toBeVisible();
    await expect(page.getByText("Не удалось загрузить вакансии")).toHaveCount(0);
  });

  test("critical account APIs return readable data", async ({ page }) => {
    await page.goto("/vacancies");
    const accessToken = await page.evaluate(() =>
      window.localStorage.getItem("accessToken")
    );

    expect(accessToken).toBeTruthy();

    const headers = { Authorization: `Bearer ${accessToken}` };
    for (const endpoint of [
      "/auth/me",
      "/vacancies",
      "/hh-integration/status",
      "/billing/balance"
    ]) {
      const response = await page.request.get(`${apiUrl}${endpoint}`, {
        headers
      });
      expect(response.status(), endpoint).toBe(200);
      expect(
        response.headers()["content-type"],
        endpoint
      ).toContain("application/json");
    }
  });

  test("an existing vacancy can be opened without changing it", async ({
    page
  }) => {
    await page.goto("/vacancies");
    const accessToken = await page.evaluate(() =>
      window.localStorage.getItem("accessToken")
    );
    expect(accessToken).toBeTruthy();

    let vacancyId = testVacancyId;
    if (!vacancyId) {
      const response = await page.request.get(`${apiUrl}/vacancies`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      expect(response.status()).toBe(200);

      const body: unknown = await response.json();
      const vacancies = Array.isArray(body)
        ? body
        : typeof body === "object" &&
            body !== null &&
            "items" in body &&
            Array.isArray(body.items)
          ? body.items
          : [];

      const firstVacancy = vacancies[0];
      if (
        typeof firstVacancy === "object" &&
        firstVacancy !== null &&
        "id" in firstVacancy
      ) {
        vacancyId = String(firstVacancy.id);
      }
    }

    test.skip(!vacancyId, "The test account has no existing vacancies");

    await page.goto(`/vacancies/${vacancyId}/analysis`);

    await expect(page).toHaveURL(
      new RegExp(`/vacancies/${vacancyId}/analysis(?:[/?#]|$)`)
    );
    await expect(page.getByText("Не удалось загрузить вакансию")).toHaveCount(0);
    await expect(page.getByText("Не удалось загрузить анализ")).toHaveCount(0);
  });
});
