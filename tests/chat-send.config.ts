import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./chat-send",
  testMatch: "*.pw.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4181",
  },
  webServer: {
    command: "node chat-send/server.mjs",
    url: "http://127.0.0.1:4181/tests/chat-send/index.html",
    reuseExistingServer: false,
  },
});
