# Spairon autotests

[![Публичные smoke-тесты](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/public-smoke.yml/badge.svg)](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/public-smoke.yml)
[![Мониторинг production](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/production-smoke.yml/badge.svg)](https://github.com/IbodovAziz/Spairon_autotests/actions/workflows/production-smoke.yml)

Подробное описание сценариев, ожидаемых результатов и последнего контрольного
прогона: [docs/TEST_CASES.md](docs/TEST_CASES.md).

Настройка GitHub Actions, secrets, Telegram и зашифрованных отчётов:
[docs/CI_CD.md](docs/CI_CD.md).

Безопасные smoke-тесты production-приложения
[app.spairon.ru](https://app.spairon.ru) на Playwright + TypeScript.

## Требования

- Node.js 24+
- npm 11+

## Установка

```powershell
npm install
npx playwright install chromium
```

## Запуск публичных тестов

Публичный набор не создаёт пользователей и не отправляет письма:

```powershell
npm test
```

## Авторизованные тесты

Создайте `.env` по примеру `.env.example` и укажите выделенную тестовую
учётную запись:

```dotenv
SPAIRON_TEST_EMAIL=test@example.com
SPAIRON_TEST_PASSWORD=secret
SPAIRON_TEST_VACANCY_ID=
```

Запуск:

```powershell
npm run test:authenticated
```

Учётная запись должна быть предназначена только для мониторинга production.
Желательно иметь подключённый HeadHunter и хотя бы одну существующую вакансию.

## Production safety

UI-тесты блокируют изменяющие запросы к production API:

- создание аккаунта и демо-вакансии;
- запуск или перезапуск анализа;
- оплату;
- создание, изменение и удаление заметок или меток;
- отключение и изменение интеграции HeadHunter;
- любые другие `POST`, `PUT`, `PATCH`, `DELETE`.

Разрешён только технический `POST /auth/refresh`, необходимый для продления
авторизованной сессии. Параллельность отключена: тесты выполняются одним
worker, чтобы не создавать нагрузку на production.

## Отчёты

После запуска доступны:

- HTML: `playwright-report/index.html`;
- JUnit: `test-results/junit.xml`;
- trace, screenshot и video для упавших тестов.

Открыть HTML-отчёт:

```powershell
npm run report
```
