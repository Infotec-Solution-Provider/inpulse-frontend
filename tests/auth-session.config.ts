import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./auth-session",
  testMatch: "*.pw.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4179",
  },
  webServer: {
    command: "node auth-session/server.mjs",
    url: "http://127.0.0.1:4179/tests/auth-session/index.html",
    reuseExistingServer: false,
  },
});
