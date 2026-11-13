import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./schedules",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/schedules",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4193", timezoneId: "UTC" },
  webServer: {
    command: "node schedules/server.mjs",
    url: "http://127.0.0.1:4193/tests/schedules/index.html",
    reuseExistingServer: false,
  },
});
