import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 45_000,
  testDir: "./crm-registration",
  outputDir: "../test-results-crm-registration",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4194" },
  webServer: {
    command: "node crm-registration/server.mjs",
    url: "http://127.0.0.1:4194/tests/crm-registration/index.html",
    reuseExistingServer: false,
  },
});
