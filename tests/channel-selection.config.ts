import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./channel-selection",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4199" },
  webServer: {
    command: "node channel-selection/server.mjs",
    url: "http://127.0.0.1:4199/tests/channel-selection/index.html",
    reuseExistingServer: false,
  },
});
