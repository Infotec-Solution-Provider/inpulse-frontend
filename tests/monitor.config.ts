import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./monitor",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/monitor",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4185",
    timezoneId: "America/Sao_Paulo",
  },
  webServer: {
    command: "node monitor/server.mjs",
    url: "http://127.0.0.1:4185/tests/monitor/index.html",
    reuseExistingServer: false,
  },
});
