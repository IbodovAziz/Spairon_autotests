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

function collectTests(suites, collected = []) {
  for (const suite of suites ?? []) {
    collectTests(suite.suites, collected);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        collected.push(test);
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
    durationMs: Number(report.stats?.duration ?? 0)
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
      } else {
        summary.passed += 1;
      }
    } else if (finalStatus === "skipped") {
      summary.skipped += 1;
    } else {
      summary.failed += 1;
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
      durationMs: 0
    };
  }
}

function formatDuration(durationMs) {
  if (!durationMs) {
    return "n/a";
  }
  return `${(durationMs / 1_000).toFixed(1)} s`;
}

function statusLabel() {
  if (jobStatus === "success") {
    return "PASSED";
  }
  if (jobStatus === "cancelled") {
    return "CANCELLED";
  }
  return "FAILED";
}

function shouldNotify() {
  if (!telegramToken || !telegramChatId) {
    return false;
  }
  return notifyMode === "always" || jobStatus !== "success";
}

const summary = await loadSummary();
const markdown = [
  `## ${workflowLabel}`,
  "",
  `**Status:** ${statusLabel()}`,
  "",
  "| Total | Passed | Failed | Flaky | Skipped | Duration |",
  "| ---: | ---: | ---: | ---: | ---: | ---: |",
  `| ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.flaky} | ${summary.skipped} | ${formatDuration(summary.durationMs)} |`,
  "",
  runUrl ? `[Open workflow run](${runUrl})` : "",
  reportUrl ? `[Download test report](${reportUrl})` : ""
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
    `Spairon: ${workflowLabel}`,
    `Status: ${statusLabel()}`,
    `Total: ${summary.total}`,
    `Passed: ${summary.passed}`,
    `Failed: ${summary.failed}`,
    `Flaky: ${summary.flaky}`,
    `Skipped: ${summary.skipped}`,
    `Duration: ${formatDuration(summary.durationMs)}`,
    runUrl ? `Run: ${runUrl}` : "",
    reportUrl ? `Report: ${reportUrl}` : ""
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
