import { expect, test } from "../fixtures/production-test.js";
import {
  authorizedGetJson,
  isRecord
} from "../support/authenticated-api.js";
import { hasCredentials } from "../support/env.js";

test.describe("Authenticated account API contracts", () => {
  test.skip(
    !hasCredentials,
    "SPAIRON_TEST_EMAIL and SPAIRON_TEST_PASSWORD are not configured"
  );

  test("profile API returns the current account contract", async ({ page }) => {
    const response = await authorizedGetJson(page, "/auth/me");

    expect(response.status).toBe(200);
    expect(response.contentType).toContain("application/json");

    const profile = response.body;
    expect(isRecord(profile)).toBe(true);
    if (!isRecord(profile)) {
      return;
    }

    expect(profile.id).toEqual(expect.any(String));
    expect(profile.email).toEqual(expect.stringMatching(/^[^@\s]+@[^@\s]+$/));
    expect(profile.name).toEqual(expect.any(String));
    expect(profile.phone).toEqual(expect.any(String));
    expect(profile.organization).toEqual(expect.any(String));
  });

  test("HeadHunter status has a consistent read-only contract", async ({
    page
  }) => {
    const response = await authorizedGetJson(page, "/hh-integration/status");

    expect(response.status).toBe(200);
    const status = response.body;
    expect(isRecord(status)).toBe(true);
    if (!isRecord(status)) {
      return;
    }

    expect(status.connected).toEqual(expect.any(Boolean));
    expect(status.isExpired).toEqual(expect.any(Boolean));

    if (status.connected) {
      expect(status.connectedAt).toEqual(expect.any(String));
      expect(status.expiresAt).toEqual(expect.any(String));
      expect(isRecord(status.account)).toBe(true);
    }
  });

  test("billing configuration and balance are internally consistent", async ({
    page
  }) => {
    const [configResponse, balanceResponse] = await Promise.all([
      authorizedGetJson(page, "/billing/config"),
      authorizedGetJson(page, "/billing/balance")
    ]);

    expect(configResponse.status).toBe(200);
    expect(balanceResponse.status).toBe(200);

    const config = configResponse.body;
    const balance = balanceResponse.body;
    expect(isRecord(config)).toBe(true);
    expect(isRecord(balance)).toBe(true);
    if (!isRecord(config) || !isRecord(balance)) {
      return;
    }

    expect(config.enabled).toEqual(expect.any(Boolean));
    expect(config.pricePerGenerationRub).toEqual(expect.any(Number));
    expect(config.minQuantity).toEqual(expect.any(Number));
    expect(config.maxQuantity).toEqual(expect.any(Number));
    expect(Number(config.pricePerGenerationRub)).toBeGreaterThanOrEqual(0);
    expect(Number(config.minQuantity)).toBeGreaterThan(0);
    expect(Number(config.maxQuantity)).toBeGreaterThanOrEqual(
      Number(config.minQuantity)
    );

    expect(balance.balance).toEqual(expect.any(Number));
    expect(Number(balance.balance)).toBeGreaterThanOrEqual(0);
    expect(balance.billingEnabled).toEqual(config.enabled);
  });

  test("candidate tag library returns usable presets and recent tags", async ({
    page
  }) => {
    const response = await authorizedGetJson(page, "/candidate-tags/library");

    expect(response.status).toBe(200);
    const library = response.body;
    expect(isRecord(library)).toBe(true);
    if (!isRecord(library)) {
      return;
    }

    expect(Array.isArray(library.presets)).toBe(true);
    expect(Array.isArray(library.recent)).toBe(true);
    if (!Array.isArray(library.presets) || !Array.isArray(library.recent)) {
      return;
    }

    for (const tag of [...library.presets, ...library.recent]) {
      expect(isRecord(tag)).toBe(true);
      if (isRecord(tag)) {
        expect(tag.name).toEqual(expect.any(String));
        expect(tag.color).toEqual(expect.any(String));
      }
    }
  });
});
