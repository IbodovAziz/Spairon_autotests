import { readFile } from "node:fs/promises";

import type { APIResponse, Page } from "@playwright/test";

import {
  apiUrl,
  appUrl,
  authFile,
  testVacancyId
} from "./env.js";

export type JsonRecord = Record<string, unknown>;

export type VacancySummary = {
  id: string;
  name: string;
  alternateUrl?: string;
  areaName?: string;
  experienceName?: string;
  expiresAt?: string;
  newResponsesSinceYesterday?: number;
  responsesCount?: number;
  status?: string;
};

export type AuthorizedJsonResult = {
  body: unknown;
  contentType: string;
  status: number;
};

const jsonCache = new Map<string, Promise<AuthorizedJsonResult>>();
let savedAccessToken: Promise<string> | undefined;
let vacanciesCache: Promise<VacancySummary[]> | undefined;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getSavedAccessToken(): Promise<string> {
  savedAccessToken ??= (async () => {
    const rawState = await readFile(authFile, "utf8");
    const state: unknown = JSON.parse(rawState);
    if (!isRecord(state) || !Array.isArray(state.origins)) {
      throw new Error("Saved Playwright auth state has an unexpected format");
    }

    const appOrigin = new URL(appUrl).origin;
    for (const originEntry of state.origins) {
      if (
        !isRecord(originEntry) ||
        originEntry.origin !== appOrigin ||
        !Array.isArray(originEntry.localStorage)
      ) {
        continue;
      }

      const tokenEntry = originEntry.localStorage.find(
        (entry) => isRecord(entry) && entry.name === "accessToken"
      );
      if (isRecord(tokenEntry) && typeof tokenEntry.value === "string") {
        return tokenEntry.value;
      }
    }

    throw new Error("Access token is missing in saved Playwright auth state");
  })();

  return savedAccessToken;
}

export async function getAccessToken(page: Page): Promise<string> {
  if (!page.url().startsWith(appUrl)) {
    await page.goto("/vacancies");
  }

  const token = await page.evaluate(() =>
    window.localStorage.getItem("accessToken")
  );

  if (!token) {
    throw new Error("Authenticated access token is missing");
  }

  return token;
}

export async function authorizedGet(
  page: Page,
  endpoint: string
): Promise<APIResponse> {
  const accessToken = await getSavedAccessToken();
  return page.request.get(`${apiUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export async function authorizedGetJson(
  page: Page,
  endpoint: string
): Promise<AuthorizedJsonResult> {
  let cached = jsonCache.get(endpoint);
  if (!cached) {
    cached = (async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await authorizedGet(page, endpoint);
        if (response.status() !== 429 || attempt === 2) {
          return {
            body: response.ok() ? await response.json() : null,
            contentType: response.headers()["content-type"] ?? "",
            status: response.status()
          };
        }

        const retryAfterSeconds = Number(
          response.headers()["retry-after"] ?? attempt + 1
        );
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(retryAfterSeconds, 1) * 1_000)
        );
      }

      throw new Error(`GET ${endpoint} exhausted retry attempts`);
    })();
    jsonCache.set(endpoint, cached);
  }

  return cached;
}

export async function getVacancies(page: Page): Promise<VacancySummary[]> {
  vacanciesCache ??= (async () => {
    const response = await authorizedGetJson(page, "/vacancies");
    if (response.status !== 200) {
      throw new Error(`GET /vacancies returned ${response.status}`);
    }

    if (Array.isArray(response.body)) {
      return response.body as VacancySummary[];
    }

    if (isRecord(response.body) && Array.isArray(response.body.items)) {
      return response.body.items as VacancySummary[];
    }

    throw new Error("GET /vacancies returned an unexpected payload");
  })();

  return vacanciesCache;
}

export async function resolveVacancyId(page: Page): Promise<string> {
  if (testVacancyId) {
    return testVacancyId;
  }

  const vacancies = await getVacancies(page);
  return vacancies[0]?.id ? String(vacancies[0].id) : "";
}
