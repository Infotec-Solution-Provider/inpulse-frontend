import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./mass-audience",
  testMatch: "*.pw.ts",
  workers: 1,
  outputDir: "../test-results/mass-audience",
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4206" },
  webServer: {
    command: "node mass-audience/server.mjs",
    url: "http://127.0.0.1:4206/tests/mass-audience/index.html",
    reuseExistingServer: false,
  },
});
