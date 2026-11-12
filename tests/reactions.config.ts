import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./reactions",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/reactions",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4197" },
  webServer: {
    command: "node reactions/server.mjs",
    url: "http://127.0.0.1:4197/tests/reactions/index.html",
    reuseExistingServer: false,
  },
});
