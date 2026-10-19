import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 60_000,
  testDir: "./crm-catalogs",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4193" },
  webServer: {
    command: "node crm-catalogs/server.mjs",
    url: "http://127.0.0.1:4193/tests/crm-catalogs/index.html",
    reuseExistingServer: false,
  },
});
