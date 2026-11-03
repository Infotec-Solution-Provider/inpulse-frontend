import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./satisfaction",
  testMatch: "*.pw.ts",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/satisfaction",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4198" },
  webServer: {
    command: "node satisfaction/server.mjs",
    url: "http://127.0.0.1:4198/tests/satisfaction/index.html",
    reuseExistingServer: false,
  },
});
