import { expect, test } from "@playwright/test";

import { apiUrl, appUrl } from "../support/env.js";

test.describe("Public deployment smoke", () => {
  test("frontend document and referenced assets are available", async ({
    request
  }) => {
    const documentResponse = await request.get(appUrl);

    expect(documentResponse.status()).toBe(200);
    expect(documentResponse.headers()["content-type"]).toContain("text/html");

    const html = await documentResponse.text();
    expect(html).toContain('<div id="app"></div>');

    const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
      ([, assetPath]) => assetPath
    );
    expect(assetPaths.length).toBeGreaterThanOrEqual(2);

    for (const assetPath of assetPaths) {
      const assetResponse = await request.get(`${appUrl}${assetPath}`);
      expect(assetResponse.status(), assetPath).toBe(200);
      expect(Number(assetResponse.headers()["content-length"] ?? 1)).toBeGreaterThan(
        0
      );
    }
  });

  for (const endpoint of [
    "/auth/me",
    "/vacancies",
    "/hh-integration/status",
    "/billing/balance"
  ]) {
    test(`protected API rejects anonymous request: ${endpoint}`, async ({
      request
    }) => {
      const response = await request.get(`${apiUrl}${endpoint}`);
      expect(response.status()).toBe(401);
    });
  }
});
