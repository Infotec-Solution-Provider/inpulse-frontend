import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./crm-purchases",
  testMatch: "*.pw.ts",
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4198" },
  webServer: {
    command: "node crm-purchases/server.mjs",
    url: "http://127.0.0.1:4198/tests/crm-purchases/index.html",
    reuseExistingServer: false,
  },
});
