import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./dual-frontend",
  testMatch: "*.pw.ts",
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: process.env.DUAL_FRONTEND_BASE_URL || "http://127.0.0.1:13011" },
});
