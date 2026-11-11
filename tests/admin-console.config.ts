import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./admin-console",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:4194" },
  webServer: {
    command: "node tests/admin-console/server.mjs",
    cwd: "..",
    url: "http://127.0.0.1:4194/infotec/admin/",
    reuseExistingServer: false,
  },
});
