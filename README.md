# Spairon autotests

[![Публичные smoke-тесты](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/public-smoke.yml/badge.svg)](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/public-smoke.yml)
[![Мониторинг production](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/production-smoke.yml/badge.svg)](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/production-smoke.yml)

Подробное описание активных критических сценариев:
[docs/TEST_CASES.md](docs/TEST_CASES.md).

Настройка GitHub Actions, secrets, Telegram и зашифрованных отчётов:
[docs/CI_CD.md](docs/CI_CD.md).

Независимые критические smoke-тесты production-приложения
[app.spairon.ru](https://app.spairon.ru) на Playwright + TypeScript.

Активный набор проверяет авторизацию, регистрацию без создания аккаунта,
выход и интеграцию HeadHunter. Вакансии и анализ временно исключены из CI,
пока функциональность дорабатывается.

## Требования

- Node.js 24+
- npm 11+

## Установка

```powershell
npm install
npx playwright install chromium
```

## Запуск всех критических тестов

```powershell
npm run test:critical
```

## Запуск публичных тестов

Публичный набор не создаёт пользователей и не отправляет письма:

```powershell
npm run test:public
```

## Авторизованные тесты

Создайте `.env` по примеру `.env.example` и укажите выделенную тестовую
учётную запись:

```dotenv
SPAIRON_TEST_EMAIL=test@example.com
SPAIRON_TEST_PASSWORD=secret
```

Запуск:

```powershell
npm run test:authenticated
```

Учётная запись должна быть предназначена только для мониторинга production.
HeadHunter может быть как подключён, так и отключён: тесты проверяют оба
состояния.

Каждый авторизованный тест самостоятельно выполняет вход в новом browser
context. Падение одного кейса не приводит к автоматическому `skipped` остальных.

## Production safety

UI-тесты блокируют изменяющие запросы к production API:

- создание аккаунта;
- оплату;
- создание, изменение и удаление заметок или меток;
- отключение и изменение интеграции HeadHunter;
- любые другие `POST`, `PUT`, `PATCH`, `DELETE`.

Разрешены только необходимые для тестов сессии `POST /auth/login`,
`POST /auth/logout`, технический `POST /auth/refresh` и безопасные GET-запросы.
Параллельность отключена: тесты выполняются одним worker.

## Отчёты

После запуска доступны:

- HTML: `playwright-report/index.html`;
- JUnit: `test-results/junit.xml`;
- trace, screenshot и video для упавших тестов.

GitHub Summary и Telegram-уведомление содержат не только название упавшего
теста, но и краткую причину: HTTP-статус, сообщение API и
`Expected/Received`.

Открыть HTML-отчёт:

```powershell
npm run report
```
