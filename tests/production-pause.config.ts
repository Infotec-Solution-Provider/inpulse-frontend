import { defineConfig, devices } from "@playwright/test";
export default defineConfig({testDir:"./production-pause",testMatch:"*.pw.ts",workers:1,reporter:"list",outputDir:"../test-results-production-pause-modern",
 use:{...devices["Desktop Chrome"],baseURL:"http://127.0.0.1:4212",permissions:["microphone"],launchOptions:{args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]}},
 webServer:{command:"node production-pause/server.mjs",url:"http://127.0.0.1:4212/tests/production-pause/index.html",reuseExistingServer:false}});
