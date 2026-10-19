import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  outputDir: "../test-results-crm-marketing",
  testDir: "./crm-marketing",
  testMatch: "*.pw.ts",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4197" },
  webServer: {
    command: "node crm-marketing/server.mjs",
    url: "http://127.0.0.1:4197/tests/crm-marketing/index.html",
    reuseExistingServer: false,
  },
});
