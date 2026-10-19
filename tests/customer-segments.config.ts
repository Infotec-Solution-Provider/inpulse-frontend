import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./customer-segments",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/customer-segments",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4191" },
  webServer: {
    command: "node customer-segments/server.mjs",
    url: "http://127.0.0.1:4191/tests/customer-segments/index.html",
    reuseExistingServer: false,
  },
});
