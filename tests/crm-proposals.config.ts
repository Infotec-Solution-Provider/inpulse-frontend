import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 30000,
  testDir: "./crm-proposals",
  testMatch: "*.pw.ts",
  outputDir: "../test-results-crm-proposals",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4196" },
  webServer: {
    command: "node crm-proposals/server.mjs",
    url: "http://127.0.0.1:4196/tests/crm-proposals/index.html",
    reuseExistingServer: false,
  },
});
