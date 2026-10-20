import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./attendance-ui",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/attendance-ui",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4210",
    permissions: ["microphone"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: {
    command: "node attendance-ui/server.mjs",
    url: "http://127.0.0.1:4210/tests/attendance-ui/index.html",
    reuseExistingServer: false,
  },
});
