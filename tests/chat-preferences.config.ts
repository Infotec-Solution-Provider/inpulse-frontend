import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./chat-preferences",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4201" },
  webServer: {
    command: "node chat-preferences/server.mjs",
    url: "http://127.0.0.1:4201/tests/chat-preferences/index.html",
    reuseExistingServer: false,
  },
});
