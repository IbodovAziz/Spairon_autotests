import { expect, test as base } from "@playwright/test";

import { apiUrl } from "../support/env.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const allowedAuthMutations = new Set([
  "POST /auth/login",
  "POST /auth/logout",
  "POST /auth/refresh"
]);

type AuthSessionFixtures = {
  blockedMutations: string[];
};

export const test = base.extend<AuthSessionFixtures>({
  blockedMutations: async ({}, use) => {
    await use([]);
  },

  page: async ({ page, blockedMutations }, use) => {
    await page.route(`${apiUrl}/**`, async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      const pathname = new URL(request.url()).pathname;
      const signature = `${method} ${pathname}`;

      if (
        !safeMethods.has(method) &&
        !allowedAuthMutations.has(signature)
      ) {
        blockedMutations.push(signature);
        await route.abort("blockedbyclient");
        return;
      }

      await route.continue();
    });

    await use(page);

    expect(
      blockedMutations,
      `Тест попытался изменить production-данные запрещённым запросом: ${blockedMutations.join(", ")}`
    ).toEqual([]);
  }
});

export { expect } from "@playwright/test";
