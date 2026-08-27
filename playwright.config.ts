import { defineConfig, devices } from "@playwright/test";

const performanceArtifactKey = [
  `chats-${process.env.PERF_CHAT_COUNT || "500"}`,
  `cpu-${process.env.PERF_CPU_RATE || "4"}`,
  `telemetry-${process.env.PERF_TELEMETRY_ENABLED === "false" ? "off" : "on"}`,
].join("-");

const performanceRunRequested =
  process.argv.some(
    (argument) =>
      argument.includes("performance.spec.ts") || argument.includes("chromium-performance"),
  ) ||
  ["PERF_CHAT_COUNT", "PERF_CPU_RATE", "PERF_TELEMETRY_ENABLED", "PERF_AB_RUNS"].some(
    (name) => process.env[name] !== undefined,
  );

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: `.performance-artifacts/report/${performanceArtifactKey}`, open: "never" },
    ],
  ],
  outputDir: `.performance-artifacts/results/${performanceArtifactKey}`,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-performance",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--disable-web-security"] },
      },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:3000",
    // Performance comparisons must always start the production build prepared
    // for that run. Reusing an unrelated process on :3000 invalidates the A/B
    // result and can silently exercise stale code or environment variables.
    reuseExistingServer: !process.env.CI && !performanceRunRequested,
    env: {
      NEXT_PUBLIC_USERS_URL: "http://localhost:8001",
      NEXT_PUBLIC_CUSTOMERS_URL: "http://localhost:8002",
      NEXT_PUBLIC_SOCKET_URL: "http://localhost:8004",
      NEXT_PUBLIC_WHATSAPP_URL: "http://localhost:8005",
    },
  },
});
