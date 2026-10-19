import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./crm-users",
  outputDir: "../test-results-crm-users",
  testMatch: "*.pw.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4195" },
  webServer: {
    command: "node crm-users/server.mjs",
    url: "http://127.0.0.1:4195/tests/crm-users/index.html",
    reuseExistingServer: false,
  },
});
