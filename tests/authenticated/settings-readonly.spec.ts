import type { Page } from "@playwright/test";

import { expect, test } from "../fixtures/production-test.js";
import {
  authorizedGetJson,
  isRecord
} from "../support/authenticated-api.js";
import { hasCredentials } from "../support/env.js";

async function openSettings(page: Page) {
  await page.goto("/vacancies");
  await page.getByRole("button", { name: /^Настройки:/ }).click();
  return page.getByRole("dialog", { name: "Настройки" });
}

test.describe("Settings read-only tabs", () => {
  test.skip(
    !hasCredentials,
    "SPAIRON_TEST_EMAIL and SPAIRON_TEST_PASSWORD are not configured"
  );

  test("integration tab reflects HeadHunter connection status", async ({
    page
  }) => {
    const statusResponse = await authorizedGetJson(
      page,
      "/hh-integration/status"
    );
    const status = statusResponse.body;
    expect(isRecord(status)).toBe(true);

    const dialog = await openSettings(page);
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("tab", { name: "Интеграция" })
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      dialog.getByRole("tabpanel", { name: "Интеграция" })
    ).toBeVisible();

    if (isRecord(status) && status.connected) {
      await expect(dialog.getByText(/Подключено/).first()).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Отключить HeadHunter" })
      ).toBeVisible();
    } else {
      await expect(
        dialog.getByRole("button", { name: "Подключить HeadHunter" })
      ).toBeVisible();
    }
  });

  test("account tab shows profile fields without changing them", async ({
    page
  }) => {
    const dialog = await openSettings(page);
    await dialog.getByRole("tab", { name: "Аккаунт" }).click();

    const panel = dialog.getByRole("tabpanel", { name: "Аккаунт" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Имя", { exact: true })).toBeVisible();
    await expect(panel.getByText("Почта", { exact: true })).toBeVisible();
    await expect(panel.getByText("Организация", { exact: true })).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Выйти", exact: true })
    ).toBeVisible();
  });

  test("billing tab displays the API balance without starting payment", async ({
    page
  }) => {
    const balanceResponse = await authorizedGetJson(page, "/billing/balance");
    const balance = balanceResponse.body;
    expect(isRecord(balance)).toBe(true);
    if (!isRecord(balance)) {
      return;
    }

    const dialog = await openSettings(page);
    await dialog.getByRole("tab", { name: "Оплата" }).click();

    const panel = dialog.getByRole("tabpanel", { name: "Оплата" });
    await expect(panel.getByText("Баланс", { exact: true })).toBeVisible();
    await expect(
      panel.getByText(new RegExp(`^${Number(balance.balance)} генерац`))
    ).toBeVisible();

    if (balance.billingEnabled) {
      await expect(panel.getByText("Пополнение счёта")).toBeVisible();
      await expect(
        panel.getByRole("button", { name: "Перейти к оплате" })
      ).toBeVisible();
    }
  });
});
