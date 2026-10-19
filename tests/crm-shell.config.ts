import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./crm-shell",
  testMatch: "*.pw.ts",
  workers: 1,
  outputDir: "../test-results-crm-shell",
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4202",
    permissions: ["microphone"],
    launchOptions: {
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: {
    command: "node crm-shell/server.mjs",
    url: "http://127.0.0.1:4202/tests/crm-shell/index.html",
    reuseExistingServer: false,
  },
});
