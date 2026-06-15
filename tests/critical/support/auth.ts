import type { APIResponse, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  apiUrl,
  testEmail,
  testPassword
} from "../../support/env.js";

async function responsePreview(response: {
  text(): Promise<string>;
}): Promise<string> {
  try {
    return (await response.text()).replace(/\s+/g, " ").slice(0, 300);
  } catch {
    return "тело ответа недоступно";
  }
}

export async function login(page: Page): Promise<void> {
  await test.step("Войти выделенной тестовой учётной записью", async () => {
    const documentResponse = await page.goto("/login");
    expect(
      documentResponse?.status(),
      "Страница входа недоступна: GET /login должен вернуть HTTP 200"
    ).toBe(200);

    await page.locator("#login-email").fill(testEmail);
    await page.locator("#login-password").fill(testPassword);

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url() === `${apiUrl}/auth/login`
    );
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    const loginResponse = await loginResponsePromise;

    expect(
      loginResponse.status(),
      `Авторизация не выполнена: POST /auth/login вернул HTTP ${loginResponse.status()}. Ответ: ${await responsePreview(loginResponse)}`
    ).toBe(200);
    await expect(
      page,
      "После успешного входа пользователь должен перейти на страницу вакансий"
    ).toHaveURL(/\/vacancies(?:[/?#]|$)/);
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Boolean(window.localStorage.getItem("accessToken"))
          ),
        {
          message:
            "После входа accessToken должен быть сохранён в localStorage"
        }
      )
      .toBe(true);
  });
}

export async function authorizedGet(
  page: Page,
  endpoint: string
): Promise<APIResponse> {
  const token = await page.evaluate(() =>
    window.localStorage.getItem("accessToken")
  );
  expect(
    token,
    `Нельзя проверить GET ${endpoint}: accessToken отсутствует после входа`
  ).toBeTruthy();

  return page.request.get(`${apiUrl}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function expectJsonStatus(
  response: APIResponse,
  endpoint: string,
  expectedStatus = 200
): Promise<void> {
  expect(
    response.status(),
    `${endpoint} недоступен: ожидался HTTP ${expectedStatus}, получен HTTP ${response.status()}. Ответ: ${await responsePreview(response)}`
  ).toBe(expectedStatus);
  expect(
    response.headers()["content-type"] ?? "",
    `${endpoint} должен возвращать JSON`
  ).toContain("application/json");
}
