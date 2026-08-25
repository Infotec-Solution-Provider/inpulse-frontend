import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: ".performance-artifacts/report", open: "never" }]],
  outputDir: ".performance-artifacts/results",
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
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_USERS_URL: "http://localhost:8001",
      NEXT_PUBLIC_CUSTOMERS_URL: "http://localhost:8002",
      NEXT_PUBLIC_SOCKET_URL: "http://localhost:8004",
      NEXT_PUBLIC_WHATSAPP_URL: "http://localhost:8005",
    },
  },
});
