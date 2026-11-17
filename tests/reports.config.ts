import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./reports",
  testMatch: "*.pw.ts",
  outputDir: "../test-results-reports",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4217",
    timezoneId: "America/Sao_Paulo",
  },
  webServer: {
    command: "node reports/server.mjs",
    url: "http://127.0.0.1:4217/tests/reports/index.html",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
