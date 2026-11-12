import { defineConfig, devices } from "@playwright/test";
const port = 4209;
export default defineConfig({
  testDir: "./sector-namespace", testMatch: "*.pw.ts", workers: 1, timeout: 30_000, metadata: { registration: true },
  reporter: "list", outputDir: "../test-results/sector-namespace",
  use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${port}` },
  webServer: { command: "node sector-namespace/server.mjs", env: { SECTOR_NAMESPACE_TEST_PORT: String(port) }, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
