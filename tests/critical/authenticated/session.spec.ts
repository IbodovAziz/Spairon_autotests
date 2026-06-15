import { expect, test } from "../../fixtures/auth-session-test.js";
import {
  apiUrl,
  hasCredentials
} from "../../support/env.js";
import { login } from "../support/auth.js";

test.describe("Критические проверки пользовательской сессии", () => {
  test.skip(
    !hasCredentials,
    "Не настроены SPAIRON_TEST_EMAIL и SPAIRON_TEST_PASSWORD"
  );

  test("[AUTH-005] Пользователь может войти в аккаунт", async ({ page }) => {
    await login(page);
  });

  test("[AUTH-006] Пользователь может выйти из аккаунта", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: /^Настройки:/ }).click();
    const settings = page.getByRole("dialog", { name: "Настройки" });
    await expect(
      settings,
      "После нажатия «Настройки» должен открыться диалог настроек"
    ).toBeVisible();
    await settings.getByRole("tab", { name: "Аккаунт" }).click();

    const logoutResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url() === `${apiUrl}/auth/logout`
    );
    await settings
      .getByRole("button", { name: "Выйти", exact: true })
      .click();
    const logoutResponse = await logoutResponsePromise;

    expect(
      [200, 204],
      `Выход не выполнен: POST /auth/logout вернул HTTP ${logoutResponse.status()}`
    ).toContain(logoutResponse.status());
    await expect(
      page,
      "После выхода пользователь должен перейти на страницу входа"
    ).toHaveURL(/\/login(?:\?.*)?$/);
    await expect
      .poll(
        () =>
          page.evaluate(() => window.localStorage.getItem("accessToken")),
        { message: "После выхода accessToken должен быть удалён" }
      )
      .toBeNull();

    await page.goto("/vacancies");
    await expect(
      page,
      "После выхода защищённая страница /vacancies должна перенаправлять на /login"
    ).toHaveURL(/\/login(?:\?.*)?$/);
  });
});
