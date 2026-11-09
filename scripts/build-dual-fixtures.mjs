import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Isolated browser-test builds only. Never promote these .next directories.
const next = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const current = resolve(next, "../frontend-current");
if (!existsSync(resolve(current, "package.json"))) throw new Error("Create the sibling frontend-current candidate worktree before building dual fixtures.");
const fixtureOrigin = "http://127.0.0.1:13011/_fixture";
const services = {
  USERS: "users", WHATSAPP: "whatsapp", CUSTOMERS: "customers", SOCKET: "socket", FILES: "files",
  MARKETING: "marketing", AI: "ai", INSTANCES: "instances", REPORTS: "reports", REPORTS_API: "reports",
};
const environment = { ...process.env };
for (const [key, service] of Object.entries(services)) environment[`NEXT_PUBLIC_${key}_URL`] = `${fixtureOrigin}/${service}`;
for (const [cwd, basePath] of [[current, ""], [next, "/nova"]]) {
  const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], {
    cwd, stdio: "inherit", env: { ...environment, FRONTEND_BASE_PATH: basePath, NEW_FRONTEND_ORIGIN: basePath ? "" : "http://127.0.0.1:13012" },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
