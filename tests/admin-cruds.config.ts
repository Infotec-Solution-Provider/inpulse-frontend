import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./admin-cruds",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../test-results/admin-cruds",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4201" },
  webServer: {
    command: "node admin-cruds/server.mjs",
    url: "http://127.0.0.1:4201/tests/admin-cruds/index.html",
    reuseExistingServer: false,
  },
});
