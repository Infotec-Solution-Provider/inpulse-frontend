import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./customer-search',testMatch:'*.pw.ts',timeout:60000,workers:1,reporter:'list',use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:4197'},webServer:{command:'node customer-search/server.mjs',url:'http://127.0.0.1:4197/tests/customer-search/index.html',reuseExistingServer:false}});
