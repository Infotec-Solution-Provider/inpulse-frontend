import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 45_000,
  testDir: "./crm-imports",
  outputDir: "../test-results-crm-imports",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4196" },
  webServer: {
    command: "node crm-imports/server.mjs",
    url: "http://127.0.0.1:4196/tests/crm-imports/index.html",
    reuseExistingServer: false,
  },
});
