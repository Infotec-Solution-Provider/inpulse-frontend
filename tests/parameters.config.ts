import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./parameters",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4187" },
  webServer: {
    command: "node parameters/server.mjs",
    url: "http://127.0.0.1:4187/tests/parameters/index.html",
    reuseExistingServer: false,
  },
});
