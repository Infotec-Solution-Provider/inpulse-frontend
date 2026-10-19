import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./crm-ui",
  testMatch: "*.pw.ts",
  workers: 1,
  outputDir: "../test-results/crm-ui",
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4198" },
  webServer: {
    command: "node crm-ui/server.mjs",
    url: "http://127.0.0.1:4198/tests/crm-ui/index.html",
    reuseExistingServer: false,
  },
});
