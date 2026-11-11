import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
if (!process.env.ADMIN_SERVICE_SOURCE)
  throw new Error(
    "Set ADMIN_SERVICE_SOURCE to the admin-service checkout before running integration tests.",
  );
const require = createRequire(resolve(process.env.ADMIN_SERVICE_SOURCE, "package.json"));
const child = spawn(
  process.execPath,
  [
    require.resolve("tsx/cli"),
    "--tsconfig",
    resolve(process.env.ADMIN_SERVICE_SOURCE, "tsconfig.json"),
    fileURLToPath(new URL("./real-server.mts", import.meta.url)),
  ],
  { stdio: "inherit", cwd: process.env.ADMIN_SERVICE_SOURCE },
);
process.once("SIGTERM", () => child.kill("SIGTERM"));
process.once("SIGINT", () => child.kill("SIGINT"));
child.once("exit", (code) => process.exit(code ?? 1));
