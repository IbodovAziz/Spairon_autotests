import path from "node:path";

export const appUrl =
  process.env.SPAIRON_APP_URL?.replace(/\/+$/, "") ?? "https://app.spairon.ru";
export const apiUrl =
  process.env.SPAIRON_API_URL?.replace(/\/+$/, "") ??
  "https://server.spairon.ru";

export const testEmail = process.env.SPAIRON_TEST_EMAIL?.trim() ?? "";
export const testPassword = process.env.SPAIRON_TEST_PASSWORD ?? "";
export const testVacancyId =
  process.env.SPAIRON_TEST_VACANCY_ID?.trim() ?? "";

export const hasCredentials = Boolean(testEmail && testPassword);
export const authFile = path.resolve("playwright/.auth/user.json");
