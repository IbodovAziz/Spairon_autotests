import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

import { appUrl, authFile, hasCredentials } from "./tests/support/env.js";

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["json", { outputFile: "test-results/results.json" }]
  ],
  use: {
    baseURL: appUrl,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "public-chromium",
      testMatch: /public\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "authenticated-chromium",
      testMatch: /authenticated\/.*\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: hasCredentials ? authFile : undefined
      }
    }
  ]
});
