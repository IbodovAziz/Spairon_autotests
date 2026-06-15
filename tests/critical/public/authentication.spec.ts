import { expect, test } from "../../fixtures/production-test.js";

test.describe("Критические проверки авторизации", () => {
  test("[AUTH-001] Страница входа доступна", async ({ page }) => {
    const response = await page.goto("/login");

    expect(
      response?.status(),
      "Страница входа недоступна: GET /login должен вернуть HTTP 200"
    ).toBe(200);
    await expect(page).toHaveTitle("Вход — Спайрон");
    await expect(
      page.getByRole("heading", { name: "Вход", exact: true }),
      "На странице входа отсутствует заголовок «Вход»"
    ).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Войти", exact: true })
    ).toBeVisible();
  });

  test("[AUTH-002] Email обязателен для входа", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-password").fill("not-a-real-password");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(
      page.getByText("Укажите email"),
      "Для пустого email должно отображаться сообщение «Укажите email»"
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("[AUTH-003] Email неправильного формата отклоняется", async ({
    page
  }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("invalid-email");
    await page.locator("#login-password").fill("not-a-real-password");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(
      page.getByText("Некорректный email"),
      "Для email неправильного формата должно отображаться «Некорректный email»"
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("[AUTH-004] Пароль обязателен для входа", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill("autotest@example.com");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(
      page.getByText("Укажите пароль"),
      "Для пустого пароля должно отображаться сообщение «Укажите пароль»"
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
