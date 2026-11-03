import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./crm-administration",
  testMatch: "*.pw.ts",
  outputDir: "../test-results-crm-administration",
  timeout: 45000,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4198" },
  webServer: {
    command: "node crm-administration/server.mjs",
    url: "http://127.0.0.1:4198/tests/crm-administration/index.html",
    reuseExistingServer: false,
  },
});
