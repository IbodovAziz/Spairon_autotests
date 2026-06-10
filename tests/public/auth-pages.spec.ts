import { expect, test } from "../fixtures/production-test.js";

test.describe("Public authentication pages", () => {
  test("login page renders and validates required fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle("Вход — Спайрон");
    await expect(
      page.getByRole("heading", { name: "Вход", exact: true })
    ).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();

    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page.getByText("Укажите email")).toBeVisible();

    await page.locator("#login-email").fill("autotest@example.com");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page.getByText("Укажите пароль")).toBeVisible();
  });

  test("login page links lead to recovery and registration", async ({
    page
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("link", { name: "Забыли пароль?" })
    ).toHaveAttribute("href", "/forgot-password");
    await expect(
      page.getByRole("link", { name: "Зарегистрироваться" })
    ).toHaveAttribute("href", "/register");
    await expect(
      page.getByRole("link", { name: "Политикой конфиденциальности" })
    ).toHaveAttribute("href", "https://spairon.ru/privacy-policy");
    await expect(
      page.getByRole("link", { name: "Публичной офертой" })
    ).toHaveAttribute("href", "https://spairon.ru/terms-of-service");
  });

  test("registration page renders and validates without creating an account", async ({
    page
  }) => {
    await page.goto("/register");

    await expect(page).toHaveTitle("Регистрация — Спайрон");
    await expect(
      page.getByRole("heading", { name: "Регистрация", exact: true })
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Зарегистрироваться", exact: true })
      .click();

    await expect(page.getByText("Укажите имя")).toBeVisible();

    await page.locator("#register-name").fill("Автотест");
    await page.locator("#register-email").fill("invalid-email");
    await page
      .getByRole("button", { name: "Зарегистрироваться", exact: true })
      .click();

    await expect(page.getByText("Некорректный email")).toBeVisible();
  });

  test("password recovery validates email without sending a letter", async ({
    page
  }) => {
    await page.goto("/forgot-password");

    await expect(page).toHaveTitle("Восстановление пароля — Спайрон");
    await expect(
      page.getByRole("heading", { name: "Восстановление пароля" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Далее", exact: true }).click();
    await expect(page.getByText("Укажите email")).toBeVisible();
  });
});
