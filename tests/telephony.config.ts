import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./telephony", testMatch: "*.pw.ts", workers: 1, reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4184", permissions: ["microphone"], launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } },
  webServer: { command: "node telephony/server.mjs", url: "http://127.0.0.1:4184/tests/telephony/index.html", reuseExistingServer: false },
});
