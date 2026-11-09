import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
const next = process.cwd();
const current = resolve(next, "../frontend-current");
export default defineConfig({
  testDir: "./dual-frontend", testMatch: "*.pw.ts", workers: 1, timeout: 45_000,
  reporter: "list", outputDir: "../test-results/dual-frontend",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:13011", serviceWorkers: "block" },
  webServer: [
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 13011", cwd: current, env: { NEW_FRONTEND_ORIGIN: "http://127.0.0.1:13012" }, url: "http://127.0.0.1:13011/odim/login", reuseExistingServer: false },
    { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 13012", cwd: next, env: { FRONTEND_BASE_PATH: "/nova" }, url: "http://127.0.0.1:13012/nova/odim/login", reuseExistingServer: false },
  ],
});
