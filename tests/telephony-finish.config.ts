import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./telephony-finish",
  testMatch: "*.pw.ts",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:4186", browserName: "chromium", headless: true },
  webServer: {
    command: "node telephony-finish/server.mjs",
    url: "http://127.0.0.1:4186/tests/telephony-finish/index.html",
    reuseExistingServer: false,
    timeout: 60000,
  },
  reporter: "line",
});
