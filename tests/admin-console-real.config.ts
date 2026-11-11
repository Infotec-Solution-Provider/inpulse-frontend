import { defineConfig } from "@playwright/test";
import base from "./admin-console.config";
process.env.ADMIN_REAL_API = "1";
export default defineConfig({
  ...base,
  webServer: {
    command: "node tests/admin-console/launch-real.mjs",
    cwd: "..",
    url: "http://127.0.0.1:4194/infotec/admin/",
    reuseExistingServer: false,
  },
});
