import type { Page } from "@playwright/test";

import { expect, test } from "../../fixtures/production-test.js";

async function openRegistration(page: Page) {
  const response = await page.goto("/register");
  expect(
    response?.status(),
    "Страница регистрации недоступна: GET /register должен вернуть HTTP 200"
  ).toBe(200);
}

test.describe("Критические проверки регистрации", () => {
  test("[REG-001] Страница регистрации доступна", async ({ page }) => {
    await openRegistration(page);

    await expect(page).toHaveTitle("Регистрация — Спайрон");
    await expect(
      page.getByRole("heading", { name: "Регистрация", exact: true }),
      "На странице отсутствует заголовок «Регистрация»"
    ).toBeVisible();

    for (const selector of [
      "#register-name",
      "#register-organization",
      "#register-email",
      "#register-phone",
      "#register-password",
      "#register-confirm-password"
    ]) {
      await expect(
        page.locator(selector),
        `На странице регистрации отсутствует поле ${selector}`
      ).toBeVisible();
    }
    await expect(
      page.getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
    ).toBeVisible();
  });

  test("[REG-002] Имя обязательно для регистрации", async ({ page }) => {
    await openRegistration(page);
    await page
      .getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
      .click();

    await expect(
      page.getByText("Укажите имя"),
      "Для пустого имени должно отображаться сообщение «Укажите имя»"
    ).toBeVisible();
  });

  test("[REG-003] Email обязателен для регистрации", async ({ page }) => {
    await openRegistration(page);
    await page.locator("#register-name").fill("Автотест");
    await page
      .getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
      .click();

    await expect(
      page.getByText("Укажите email"),
      "Для пустого email должно отображаться сообщение «Укажите email»"
    ).toBeVisible();
  });

  test("[REG-004] Email неправильного формата отклоняется", async ({
    page
  }) => {
    await openRegistration(page);
    await page.locator("#register-name").fill("Автотест");
    await page.locator("#register-email").fill("invalid-email");
    await page
      .getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
      .click();

    await expect(
      page.getByText("Некорректный email"),
      "Для email неправильного формата должно отображаться «Некорректный email»"
    ).toBeVisible();
  });

  test("[REG-005] Телефон обязателен для регистрации", async ({ page }) => {
    await openRegistration(page);
    await page.locator("#register-name").fill("Автотест");
    await page.locator("#register-email").fill("autotest@example.com");
    await page
      .getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
      .click();

    await expect(
      page.getByText("Укажите телефон"),
      "Для пустого телефона должно отображаться сообщение «Укажите телефон»"
    ).toBeVisible();
  });

  test("[REG-006] Пароль обязателен для регистрации", async ({ page }) => {
    await openRegistration(page);
    await page.locator("#register-name").fill("Автотест");
    await page.locator("#register-email").fill("autotest@example.com");
    await page.locator("#register-phone").fill("9990000000");
    await page
      .getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
      .click();

    await expect(
      page.getByText("Укажите пароль"),
      "Для пустого пароля должно отображаться сообщение «Укажите пароль»"
    ).toBeVisible();
  });

  test("[REG-007] Подтверждение пароля должно совпадать", async ({
    page
  }) => {
    await openRegistration(page);
    await page.locator("#register-name").fill("Автотест");
    await page.locator("#register-email").fill("autotest@example.com");
    await page.locator("#register-phone").fill("9990000000");
    await page.locator("#register-password").fill("StrongPass123!");
    await page
      .locator("#register-confirm-password")
      .fill("DifferentPass123!");
    await page
      .getByRole("button", {
        name: "Зарегистрироваться",
        exact: true
      })
      .click();

    await expect(
      page.getByText("Пароли не совпадают"),
      "При разных паролях должно отображаться сообщение «Пароли не совпадают»"
    ).toBeVisible();
  });
});
