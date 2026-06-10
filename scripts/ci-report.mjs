import { appendFile, readFile } from "node:fs/promises";

const resultsFile =
  process.env.PLAYWRIGHT_JSON_REPORT ?? "test-results/results.json";
const workflowLabel = process.env.WORKFLOW_LABEL ?? "Spairon tests";
const jobStatus = process.env.JOB_STATUS ?? "unknown";
const runUrl = process.env.RUN_URL ?? "";
const reportUrl = process.env.REPORT_URL ?? "";
const notifyMode = process.env.NOTIFY_MODE ?? "always";
const telegramToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
const telegramChatId = process.env.TELEGRAM_CHAT_ID ?? "";
const environmentLabel = process.env.ENVIRONMENT_LABEL ?? "Production";
const targetUrl = process.env.TARGET_URL ?? "";
const repositoryName = process.env.REPOSITORY_NAME ?? "";
const branchName = process.env.BRANCH_NAME ?? "";
const eventName = process.env.EVENT_NAME ?? "";
const actorName = process.env.ACTOR_NAME ?? "";
const commitSha = process.env.COMMIT_SHA ?? "";
const runNumber = process.env.RUN_NUMBER ?? "";
const runAttempt = process.env.RUN_ATTEMPT ?? "";

function collectTests(suites, collected = [], parentTitles = []) {
  for (const suite of suites ?? []) {
    const suiteTitles = suite.title
      ? [...parentTitles, suite.title]
      : parentTitles;
    collectTests(suite.suites, collected, suiteTitles);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        collected.push({
          ...test,
          displayTitle: [...suiteTitles, spec.title]
            .filter(Boolean)
            .join(" > ")
        });
      }
    }
  }
  return collected;
}

function calculateSummary(report) {
  const tests = collectTests(report.suites);
  const summary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    total: tests.length,
    durationMs: Number(report.stats?.duration ?? 0),
    failedTests: [],
    flakyTests: []
  };

  for (const test of tests) {
    const results = Array.isArray(test.results) ? test.results : [];
    const finalResult = results.at(-1);
    const finalStatus = finalResult?.status ?? test.status ?? "unknown";
    const hadFailedAttempt = results
      .slice(0, -1)
      .some((result) => !["passed", "skipped"].includes(result.status));

    if (finalStatus === "passed") {
      if (hadFailedAttempt) {
        summary.flaky += 1;
        summary.flakyTests.push(test.displayTitle);
      } else {
        summary.passed += 1;
      }
    } else if (finalStatus === "skipped") {
      summary.skipped += 1;
    } else {
      summary.failed += 1;
      summary.failedTests.push(test.displayTitle);
    }
  }

  return summary;
}

async function loadSummary() {
  try {
    const report = JSON.parse(await readFile(resultsFile, "utf8"));
    return calculateSummary(report);
  } catch {
    return {
      passed: 0,
      failed: jobStatus === "success" ? 0 : 1,
      skipped: 0,
      flaky: 0,
      total: 0,
      durationMs: 0,
      failedTests: [],
      flakyTests: []
    };
  }
}

function formatDuration(durationMs) {
  if (!durationMs) {
    return "нет данных";
  }
  return `${(durationMs / 1_000).toFixed(1)} сек.`;
}

function statusLabel() {
  if (jobStatus === "success") {
    return "УСПЕШНО";
  }
  if (jobStatus === "cancelled") {
    return "ОТМЕНЕНО";
  }
  return "ОШИБКА";
}

function eventLabel() {
  const labels = {
    push: "Push в репозиторий",
    pull_request: "Pull request",
    schedule: "Запуск по расписанию",
    workflow_dispatch: "Ручной запуск",
    workflow_run: "Запуск после завершения CI"
  };
  return labels[eventName] ?? (eventName || "неизвестно");
}

function formatRunNumber() {
  if (!runNumber) {
    return "нет данных";
  }
  return runAttempt ? `#${runNumber}, попытка ${runAttempt}` : `#${runNumber}`;
}

function executionTime() {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Moscow"
  }).format(new Date());
}

function successRate(summary) {
  if (!summary.total) {
    return "0%";
  }
  return `${Math.round(((summary.passed + summary.flaky) / summary.total) * 100)}%`;
}

function markdownTestList(title, tests) {
  if (!tests.length) {
    return [];
  }

  return [
    "",
    `### ${title}`,
    "",
    ...tests.slice(0, 10).map((test) => `- ${test}`),
    ...(tests.length > 10
      ? [`- Ещё тестов: ${tests.length - 10}`]
      : [])
  ];
}

function telegramTestList(title, tests) {
  if (!tests.length) {
    return [];
  }

  return [
    "",
    `${title}:`,
    ...tests.slice(0, 5).map((test) => `- ${test}`),
    ...(tests.length > 5 ? [`- Ещё тестов: ${tests.length - 5}`] : [])
  ];
}

function shouldNotify() {
  if (!telegramToken || !telegramChatId) {
    return false;
  }
  return notifyMode === "always" || jobStatus !== "success";
}

const summary = await loadSummary();
const markdown = [
  `## Отчёт: ${workflowLabel}`,
  "",
  `**Статус запуска: ${statusLabel()}**`,
  "",
  "### Контекст запуска",
  "",
  "| Параметр | Значение |",
  "| --- | --- |",
  `| Окружение | ${environmentLabel} |`,
  `| Целевой URL | ${targetUrl || "не указан"} |`,
  `| Репозиторий | ${repositoryName || "не указан"} |`,
  `| Ветка | ${branchName || "не указана"} |`,
  `| Событие | ${eventLabel()} |`,
  `| Коммит | ${commitSha ? `\`${commitSha.slice(0, 7)}\`` : "не указан"} |`,
  `| Инициатор | ${actorName || "не указан"} |`,
  `| Запуск | ${formatRunNumber()} |`,
  `| Время отчёта | ${executionTime()} МСК |`,
  "",
  "### Результаты тестов",
  "",
  "| Всего | Успешно | Ошибки | Нестабильные | Пропущено | Успешность | Длительность |",
  "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  `| ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.flaky} | ${summary.skipped} | ${successRate(summary)} | ${formatDuration(summary.durationMs)} |`,
  ...markdownTestList("Упавшие тесты", summary.failedTests),
  ...markdownTestList("Нестабильные тесты", summary.flakyTests),
  "",
  "### Ссылки",
  "",
  runUrl ? `- [Открыть запуск GitHub Actions](${runUrl})` : "",
  reportUrl ? `- [Скачать полный отчёт](${reportUrl})` : "",
  !reportUrl ? "- Artifact отчёта не был создан." : ""
]
  .filter(Boolean)
  .join("\n");

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
} else {
  console.log(markdown);
}

if (shouldNotify()) {
  const message = [
    `Spairon. ${workflowLabel}`,
    "",
    `Статус: ${statusLabel()}`,
    `Окружение: ${environmentLabel}`,
    `Целевой URL: ${targetUrl || "не указан"}`,
    `Репозиторий: ${repositoryName || "не указан"}`,
    `Ветка: ${branchName || "не указана"}`,
    `Событие: ${eventLabel()}`,
    `Коммит: ${commitSha ? commitSha.slice(0, 7) : "не указан"}`,
    `Инициатор: ${actorName || "не указан"}`,
    `Запуск: ${formatRunNumber()}`,
    `Время: ${executionTime()} МСК`,
    "",
    "Результаты:",
    `Всего: ${summary.total}`,
    `Успешно: ${summary.passed}`,
    `Ошибки: ${summary.failed}`,
    `Нестабильные: ${summary.flaky}`,
    `Пропущено: ${summary.skipped}`,
    `Успешность: ${successRate(summary)}`,
    `Длительность: ${formatDuration(summary.durationMs)}`,
    ...telegramTestList("Упавшие тесты", summary.failedTests),
    ...telegramTestList("Нестабильные тесты", summary.flakyTests),
    "",
    runUrl ? `Запуск: ${runUrl}` : "",
    reportUrl ? `Отчёт: ${reportUrl}` : "Отчёт: artifact не создан"
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(
    `https://api.telegram.org/bot${telegramToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: telegramChatId,
        disable_web_page_preview: true,
        text: message
      })
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Telegram notification failed with ${response.status}: ${responseText}`
    );
  }
}
