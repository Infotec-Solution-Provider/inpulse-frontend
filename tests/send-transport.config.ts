import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./send-transport",
  outputDir: "../test-results/send-transport",
  testMatch: "*.pw.ts",
  fullyParallel: true,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4182" },
  webServer: {
    command: "node send-transport/server.mjs",
    url: "http://127.0.0.1:4182/tests/send-transport/index.html",
    reuseExistingServer: false,
  },
});
