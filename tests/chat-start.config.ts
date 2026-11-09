import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./chat-start",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4202" },
  webServer: {
    command: "node chat-start/server.mjs",
    url: "http://127.0.0.1:4202/tests/chat-start/index.html",
    reuseExistingServer: false,
  },
});
