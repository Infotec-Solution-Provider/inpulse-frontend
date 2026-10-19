import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  outputDir: "../test-results-crm-purchases",
  testDir: "./crm-purchases",
  testMatch: "*.pw.ts",
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4201" },
  webServer: {
    command: "node crm-purchases/server.mjs",
    url: "http://127.0.0.1:4201/tests/crm-purchases/index.html",
    reuseExistingServer: false,
  },
});
