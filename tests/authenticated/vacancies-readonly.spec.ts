import { expect, test } from "../fixtures/production-test.js";
import {
  authorizedGetJson,
  getVacancies,
  isRecord,
  resolveVacancyId
} from "../support/authenticated-api.js";
import { hasCredentials } from "../support/env.js";

test.describe("Vacancies read-only behavior", () => {
  test.skip(
    !hasCredentials,
    "SPAIRON_TEST_EMAIL and SPAIRON_TEST_PASSWORD are not configured"
  );

  test("vacancies API returns a valid collection contract", async ({ page }) => {
    const vacancies = await getVacancies(page);

    expect(Array.isArray(vacancies)).toBe(true);
    for (const vacancy of vacancies) {
      expect(vacancy.id).toEqual(expect.any(String));
      expect(vacancy.name).toEqual(expect.any(String));
      expect(vacancy.status).toEqual(expect.any(String));
      expect(vacancy.responsesCount).toEqual(expect.any(Number));
      expect(vacancy.newResponsesSinceYesterday).toEqual(expect.any(Number));
      expect(Number(vacancy.responsesCount)).toBeGreaterThanOrEqual(0);
      expect(Number(vacancy.newResponsesSinceYesterday)).toBeGreaterThanOrEqual(
        0
      );
    }
  });

  test("vacancy search filters cards and restores the list", async ({ page }) => {
    const vacancies = await getVacancies(page);
    test.skip(vacancies.length === 0, "The test account has no vacancies");

    const vacancy = vacancies[0];
    await page.goto("/vacancies");

    const search = page.getByRole("searchbox", {
      name: "Найти по названию вакансии"
    });
    await search.fill(vacancy.name);

    await expect(
      page.getByRole("button", {
        name: `Открыть вакансию: ${vacancy.name}`,
        exact: true
      })
    ).toBeVisible();

    await search.fill("autotest-vacancy-that-does-not-exist");
    await expect(page.getByText("По вашему запросу вакансий нет")).toBeVisible();
    await expect(page.locator("article")).toHaveCount(0);

    await search.clear();
    await expect(page.locator("article")).toHaveCount(vacancies.length);
  });

  test("vacancy details API returns content and counters", async ({ page }) => {
    const vacancyId = await resolveVacancyId(page);
    test.skip(!vacancyId, "The test account has no existing vacancies");

    const response = await authorizedGetJson(page, `/vacancies/${vacancyId}`);
    expect(response.status).toBe(200);

    const vacancy = response.body;
    expect(isRecord(vacancy)).toBe(true);
    if (!isRecord(vacancy)) {
      return;
    }

    expect(String(vacancy.id)).toBe(vacancyId);
    expect(vacancy.name).toEqual(expect.any(String));
    expect(vacancy.descriptionHtml).toEqual(expect.any(String));
    expect(vacancy.alternateUrl).toEqual(
      expect.stringMatching(/^https:\/\/hh\.ru\//)
    );
    expect(Array.isArray(vacancy.keySkills)).toBe(true);
    expect(Array.isArray(vacancy.professionalRoles)).toBe(true);
    expect(isRecord(vacancy.counters)).toBe(true);

    if (isRecord(vacancy.counters)) {
      for (const counter of [
        "invitations",
        "responses",
        "unreadResponses",
        "views"
      ]) {
        expect(vacancy.counters[counter]).toEqual(expect.any(Number));
        expect(Number(vacancy.counters[counter])).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
