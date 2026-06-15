import { expect, test } from "../../fixtures/auth-session-test.js";
import { hasCredentials } from "../../support/env.js";
import {
  authorizedGet,
  expectJsonStatus,
  login
} from "../support/auth.js";

type IntegrationStatus = {
  connected?: unknown;
  connectedAt?: unknown;
  expiresAt?: unknown;
  isExpired?: unknown;
};

test.describe("Критические проверки интеграции HeadHunter", () => {
  test.skip(
    !hasCredentials,
    "Не настроены SPAIRON_TEST_EMAIL и SPAIRON_TEST_PASSWORD"
  );

  test("[HH-001] API статуса интеграции доступен", async ({ page }) => {
    await login(page);
    const response = await authorizedGet(page, "/hh-integration/status");
    await expectJsonStatus(response, "GET /hh-integration/status");

    const status = (await response.json()) as IntegrationStatus;
    expect(
      typeof status.connected,
      "Поле connected в статусе HH должно иметь тип boolean"
    ).toBe("boolean");
    expect(
      typeof status.isExpired,
      "Поле isExpired в статусе HH должно иметь тип boolean"
    ).toBe("boolean");

    if (status.connected) {
      expect(
        typeof status.connectedAt,
        "Для подключённой интеграции connectedAt должен быть строкой"
      ).toBe("string");
      expect(
        typeof status.expiresAt,
        "Для подключённой интеграции expiresAt должен быть строкой"
      ).toBe("string");
    }
  });

  test("[HH-002] OAuth-ссылка HeadHunter формируется", async ({ page }) => {
    await login(page);
    const state = `critical-smoke-${Date.now()}`;
    const response = await authorizedGet(
      page,
      `/hh-integration/authorize-url?state=${encodeURIComponent(state)}`
    );
    await expectJsonStatus(response, "GET /hh-integration/authorize-url");

    const body = (await response.json()) as { url?: unknown };
    expect(
      typeof body.url,
      "API авторизации HH должен вернуть строковое поле url"
    ).toBe("string");
    if (typeof body.url !== "string") {
      return;
    }

    const authorizeUrl = new URL(body.url);
    expect(
      authorizeUrl.protocol,
      "OAuth-ссылка HH должна использовать HTTPS"
    ).toBe("https:");
    expect(
      authorizeUrl.hostname,
      "OAuth-ссылка должна вести на домен hh.ru"
    ).toMatch(/(^|\.)hh\.ru$/);
    expect(
      authorizeUrl.searchParams.get("state"),
      "OAuth-ссылка должна сохранять переданный state"
    ).toBe(state);
  });

  test("[HH-003] Раздел интеграции доступен в настройках", async ({
    page
  }) => {
    await login(page);
    const response = await authorizedGet(page, "/hh-integration/status");
    await expectJsonStatus(response, "GET /hh-integration/status");
    const status = (await response.json()) as IntegrationStatus;

    await page.getByRole("button", { name: /^Настройки:/ }).click();
    const dialog = page.getByRole("dialog", { name: "Настройки" });
    await expect(
      dialog,
      "Диалог настроек не открылся"
    ).toBeVisible();
    await expect(
      dialog.getByRole("tab", { name: "Интеграция" }),
      "В настройках отсутствует вкладка «Интеграция»"
    ).toHaveAttribute("aria-selected", "true");

    if (status.connected) {
      await expect(
        dialog.getByText(/Подключено/).first(),
        "API сообщает о подключённом HH, но UI не показывает статус «Подключено»"
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Отключить HeadHunter" }),
        "Для подключённого HH должна отображаться кнопка отключения"
      ).toBeVisible();
    } else {
      await expect(
        dialog.getByRole("button", { name: "Подключить HeadHunter" }),
        "Для отключённого HH должна отображаться кнопка подключения"
      ).toBeVisible();
    }
  });
});
