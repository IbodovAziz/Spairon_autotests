import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/production-test.js";
import {
  authorizedGetJson,
  isRecord,
  resolveVacancyId
} from "../support/authenticated-api.js";
import { hasCredentials } from "../support/env.js";

type AnalysisResult = {
  name?: unknown;
  score?: unknown;
};

async function getCurrentAnalysis(page: Page, vacancyId: string) {
  const response = await authorizedGetJson(
    page,
    `/vacancies/${vacancyId}/analysis/current`
  );
  test.skip(response.status === 404, "The vacancy has no completed analysis");
  expect(response.status).toBe(200);
  return response.body;
}

test.describe("Vacancy analysis read-only behavior", () => {
  test.skip(
    !hasCredentials,
    "SPAIRON_TEST_EMAIL and SPAIRON_TEST_PASSWORD are not configured"
  );

  test("current analysis API returns valid Top-5 scores", async ({ page }) => {
    const vacancyId = await resolveVacancyId(page);
    test.skip(!vacancyId, "The test account has no existing vacancies");

    const analysis = await getCurrentAnalysis(page, vacancyId);
    expect(isRecord(analysis)).toBe(true);
    if (!isRecord(analysis)) {
      return;
    }

    expect(analysis.vacancyId).toBe(vacancyId);
    expect(analysis.status).toEqual(expect.any(String));
    expect(analysis.isStale).toEqual(expect.any(Boolean));
    expect(analysis.analyzedCandidateCount).toEqual(expect.any(Number));
    expect(analysis.responsesCountAtStart).toEqual(expect.any(Number));
    expect(Array.isArray(analysis.topResults)).toBe(true);

    const results = analysis.topResults as AnalysisResult[];
    expect(results.length).toBeLessThanOrEqual(5);
    for (const candidate of results) {
      expect(candidate.name).toEqual(expect.any(String));
      expect(candidate.score).toEqual(expect.any(Number));
      expect(Number(candidate.score)).toBeGreaterThanOrEqual(0);
      expect(Number(candidate.score)).toBeLessThanOrEqual(100);
    }
  });

  test("response progress and analysis history have valid contracts", async ({
    page
  }) => {
    const vacancyId = await resolveVacancyId(page);
    test.skip(!vacancyId, "The test account has no existing vacancies");

    const [progressResponse, historyResponse] = await Promise.all([
      authorizedGetJson(page, `/vacancies/${vacancyId}/responses/progress`),
      authorizedGetJson(page, `/vacancies/${vacancyId}/analysis/history`)
    ]);

    expect(progressResponse.status).toBe(200);
    expect(historyResponse.status).toBe(200);

    const progress = progressResponse.body;
    const history = historyResponse.body;
    expect(isRecord(progress)).toBe(true);
    expect(isRecord(history)).toBe(true);
    if (!isRecord(progress) || !isRecord(history)) {
      return;
    }

    expect(progress.loaded).toEqual(expect.any(Number));
    expect(progress.total).toEqual(expect.any(Number));
    expect(progress.isComplete).toEqual(expect.any(Boolean));
    expect(Number(progress.loaded)).toBeGreaterThanOrEqual(0);
    expect(Number(progress.total)).toBeGreaterThanOrEqual(0);
    expect(Number(progress.loaded)).toBeLessThanOrEqual(Number(progress.total));

    expect(Array.isArray(history.items)).toBe(true);
    for (const item of history.items as unknown[]) {
      expect(isRecord(item)).toBe(true);
      if (isRecord(item)) {
        expect(item.jobId).toEqual(expect.any(String));
        expect(item.finishedAt).toEqual(expect.any(String));
        expect(Array.isArray(item.candidates)).toBe(true);
      }
    }
  });

  test("Top-5 UI matches the current analysis response", async ({ page }) => {
    const vacancyId = await resolveVacancyId(page);
    test.skip(!vacancyId, "The test account has no existing vacancies");

    const analysis = await getCurrentAnalysis(page, vacancyId);
    test.skip(
      !isRecord(analysis) ||
        !Array.isArray(analysis.topResults) ||
        analysis.topResults.length === 0,
      "The vacancy has no Top-5 results"
    );
    if (!isRecord(analysis) || !Array.isArray(analysis.topResults)) {
      return;
    }

    const results = analysis.topResults as AnalysisResult[];
    await page.goto(`/vacancies/${vacancyId}/analysis`);

    await expect(
      page.getByRole("heading", { name: "Топ-5 кандидатов" })
    ).toBeVisible();
    const scoreBars = page.getByRole("progressbar");
    await expect(scoreBars).toHaveCount(results.length);

    for (const [index, result] of results.entries()) {
      await expect(scoreBars.nth(index)).toHaveAccessibleName(
        `${Number(result.score)}%`
      );
    }
  });

  test("history dialog shows all completed analysis runs", async ({ page }) => {
    const vacancyId = await resolveVacancyId(page);
    test.skip(!vacancyId, "The test account has no existing vacancies");

    const historyResponse = await authorizedGetJson(
      page,
      `/vacancies/${vacancyId}/analysis/history`
    );
    expect(historyResponse.status).toBe(200);
    const history = historyResponse.body;
    expect(isRecord(history)).toBe(true);
    if (!isRecord(history) || !Array.isArray(history.items)) {
      return;
    }

    await page.goto(`/vacancies/${vacancyId}/analysis`);
    await page.getByRole("button", { name: "История", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "История результатов" });
    await expect(dialog).toBeVisible();

    if (history.items.length === 0) {
      await expect(
        dialog.getByText("Завершённых анализов пока нет.")
      ).toBeVisible();
    } else {
      await expect(dialog.getByRole("heading", { level: 3 })).toHaveCount(
        history.items.length
      );
    }
  });

  test("candidate card opens resume details without editing data", async ({
    page
  }) => {
    const vacancyId = await resolveVacancyId(page);
    test.skip(!vacancyId, "The test account has no existing vacancies");

    const analysis = await getCurrentAnalysis(page, vacancyId);
    test.skip(
      !isRecord(analysis) ||
        !Array.isArray(analysis.topResults) ||
        analysis.topResults.length === 0,
      "The vacancy has no candidates"
    );
    if (!isRecord(analysis) || !Array.isArray(analysis.topResults)) {
      return;
    }

    const firstCandidate = analysis.topResults[0] as AnalysisResult;
    await page.goto(`/vacancies/${vacancyId}/analysis`);
    await page.getByRole("progressbar").first().click();

    const dialog = page.getByRole("dialog", {
      name: String(firstCandidate.name)
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Открыть на hh.ru" })
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Комментарии" })
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Резюме" })
    ).toBeVisible();
    await expect(
      dialog.getByRole("textbox", {
        name: "Впечатления, договорённости, вопросы для интервью..."
      })
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Отправить комментарий" })
    ).toBeDisabled();
  });
});
