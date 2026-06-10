# CI/CD и уведомления

В проекте настроены два GitHub Actions workflow:

- `Публичные smoke-тесты` — быстрая проверка публичных экранов и API;
- `Мониторинг production` — полный production-safe набор с
  авторизацией, доставкой зашифрованного отчёта и уведомлением.

Приложение Spairon этим репозиторием не развёртывается. CD-часть отвечает за
автоматическую доставку тестовых отчётов и непрерывную проверку production
после успешного CI в ветке `main`.

## Публичные smoke-тесты

Файл: `.github/workflows/public-smoke.yml`.

Запускается:

- при каждом push в `main`;
- для каждого pull request в `main`;
- вручную через `Actions → Публичные smoke-тесты → Run workflow`.

Workflow:

1. Устанавливает Node.js 24 и зависимости через `npm ci`.
2. Выполняет TypeScript-проверку.
3. Устанавливает Chromium.
4. Запускает 12 публичных smoke-тестов.
5. Публикует HTML, JSON, JUnit, screenshots, traces и videos как artifact.
6. Добавляет таблицу результатов в GitHub Job Summary.
7. При падении push/manual запуска отправляет Telegram-уведомление, если
   настроены Telegram secrets.

Публичный artifact хранится 14 дней. Для pull request Telegram secrets не
передаются.

## Мониторинг production

Файл: `.github/workflows/production-smoke.yml`.

Запускается:

- после успешных `Публичных smoke-тестов` для push в `main`;
- ежедневно в `06:00` и `18:00` UTC, то есть в `09:00` и `21:00` по Москве;
- вручную через GitHub Actions.

Workflow запускает полный набор из 31 теста одним worker. Параллельные
production-запуски запрещены.

Production workflow после CI принимает только успешный push в `main` из этого
же репозитория. Код из pull request или fork не выполняется с production
secrets.

## Repository secrets

Откройте:

`GitHub → Settings → Secrets and variables → Actions → New repository secret`.

Обязательные secrets для production:

| Secret | Назначение |
| --- | --- |
| `SPAIRON_TEST_EMAIL` | Email выделенной production-учётной записи |
| `SPAIRON_TEST_PASSWORD` | Пароль тестовой учётной записи |
| `REPORT_ARCHIVE_PASSWORD` | Пароль шифрования production-отчётов |

После создания secrets откройте вкладку `Variables`, создайте repository
variable `ENABLE_PRODUCTION_SMOKE` со значением `true`. Пока переменная не
задана, production job имеет статус **Skipped** и не пытается использовать
учётную запись.

Необязательные secrets:

| Secret | Назначение |
| --- | --- |
| `SPAIRON_TEST_VACANCY_ID` | ID существующей вакансии для стабильного выбора |
| `TELEGRAM_BOT_TOKEN` | Токен бота от `@BotFather` |
| `TELEGRAM_CHAT_ID` | ID пользователя, группы или канала для уведомлений |

Для `REPORT_ARCHIVE_PASSWORD` используйте случайный пароль длиной не менее
20 символов. Не добавляйте эти значения в `.env.example`, workflow или код.

## Telegram

1. Создайте бота через `@BotFather` и получите token.
2. Добавьте бота в нужный чат.
3. Получите `chat_id` через Telegram Bot API или служебного бота.
4. Создайте GitHub secrets `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.

Production workflow отправляет уведомление после каждого запуска. Public CI
уведомляет только о падениях push/manual запуска, чтобы не создавать лишний
шум.

Сообщение и GitHub Summary содержат:

- статус и название проверки;
- окружение и целевой URL;
- репозиторий, ветку и тип события;
- короткий SHA коммита и инициатора запуска;
- номер запуска и попытки;
- количество всех, успешных, упавших, нестабильных и пропущенных тестов;
- процент успешности и длительность;
- названия упавших и нестабильных тестов;
- ссылки на workflow и artifact отчёта.

Если Telegram secrets не настроены, тесты продолжают работать, а результаты
остаются в GitHub Summary и Artifacts.

## Защита production-отчётов

HTML-отчёт, screenshots, videos и traces авторизованных тестов могут содержать
данные вакансий и кандидатов. Поэтому production workflow:

1. Архивирует `playwright-report` и `test-results`.
2. Шифрует архив алгоритмом AES-256-CBC с PBKDF2.
3. Загружает только файл `production-playwright-report.tar.gz.enc`.
4. Хранит artifact 7 дней.

Пароль шифрования в artifact не попадает.

Расшифровка на компьютере с OpenSSL. В Git for Windows он обычно находится по
пути `C:\Program Files\Git\usr\bin\openssl.exe`:

```powershell
$env:REPORT_ARCHIVE_PASSWORD = "пароль-из-секрета"
$openssl = "C:\Program Files\Git\usr\bin\openssl.exe"

& $openssl enc -d -aes-256-cbc -pbkdf2 `
  -in production-playwright-report.tar.gz.enc `
  -out production-playwright-report.tar.gz `
  -pass env:REPORT_ARCHIVE_PASSWORD

tar -xzf production-playwright-report.tar.gz
npx playwright show-report playwright-report
```

После работы удалите расшифрованный архив и очистите переменную:

```powershell
Remove-Item production-playwright-report.tar.gz
Remove-Item Env:REPORT_ARCHIVE_PASSWORD
```

## GitHub Summary и JUnit

Каждый запуск создаёт:

- Markdown-таблицу в GitHub Job Summary;
- `playwright-report/index.html`;
- `test-results/junit.xml`;
- `test-results/results.json`;
- диагностические вложения упавших тестов.

JSON-результат обрабатывается `scripts/ci-report.mjs`. Ошибка Telegram не
изменяет результат тестового workflow: доставка уведомления выполняется с
`continue-on-error`.

## Рекомендуемая защита ветки

В `Settings → Branches → Branch protection rules` для `main` рекомендуется:

- включить `Require a pull request before merging`;
- включить `Require status checks to pass before merging`;
- выбрать check `Публичные Playwright-тесты`;
- запретить force push.

Так код не попадёт в `main`, пока публичный smoke-набор не пройдёт.
