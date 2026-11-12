import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./session-changes", testMatch: "*.pw.ts", workers: 1, reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4198", timezoneId: "America/Sao_Paulo" },
  webServer: { command: "node session-changes/server.mjs", url: "http://127.0.0.1:4198/tests/session-changes/index.html", reuseExistingServer: false },
});
