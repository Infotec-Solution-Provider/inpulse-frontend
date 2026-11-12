import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./frontend-flags", testMatch: "*.pw.ts", workers: 1, timeout: 30_000,
  reporter: "list", outputDir: "../test-results/frontend-flags",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4206" },
  webServer: { command: "node frontend-flags/server.mjs", url: "http://127.0.0.1:4206/odim", reuseExistingServer: false },
});
