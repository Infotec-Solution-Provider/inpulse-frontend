import { defineConfig, devices } from "@playwright/test";
const port = 4207;
export default defineConfig({
  testDir: "./legacy-history", testMatch: "*.pw.ts", workers: 1, timeout: 30_000,
  reporter: "list", outputDir: "../test-results/legacy-history",
  use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` },
  webServer: { command: "node legacy-history/server.mjs", env: { LEGACY_HISTORY_TEST_PORT: String(port) }, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
