import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./goals",
  testMatch: "*.pw.ts",
  outputDir: "../test-results-goals",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4207" },
  webServer: {
    command: "node goals/server.mjs",
    url: "http://127.0.0.1:4207/tests/goals/index.html",
    reuseExistingServer: false,
  },
});
