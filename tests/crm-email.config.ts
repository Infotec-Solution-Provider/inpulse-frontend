import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./crm-email",
  testMatch: "*.pw.ts",
  outputDir: "../test-results-crm-email",
  workers: 1,
  timeout: 45000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4213" },
  webServer: {
    command: "node crm-email/server.mjs",
    url: "http://127.0.0.1:4213/tests/crm-email/index.html",
    reuseExistingServer: false,
  },
});
