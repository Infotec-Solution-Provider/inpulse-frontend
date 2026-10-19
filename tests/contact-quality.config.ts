import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./contact-quality", testMatch: "*.pw.ts", workers: 1, reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4196" },
  webServer: { command: "node contact-quality/server.mjs", url: "http://127.0.0.1:4196/tests/contact-quality/index.html", reuseExistingServer: false },
});
