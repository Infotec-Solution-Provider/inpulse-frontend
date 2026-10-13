import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./channels",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4191",
    timezoneId: "America/Sao_Paulo",
  },
  webServer: {
    command: "node channels/server.mjs",
    url: "http://127.0.0.1:4191/tests/channels/index.html",
    reuseExistingServer: false,
  },
});
