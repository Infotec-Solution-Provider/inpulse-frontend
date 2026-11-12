import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Dedicated Odim build: Next.js embeds these public values in the browser bundle.
// Runtime PM2 environment variables cannot repair a build made without them.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicOrigin = "https://inpulse.infotecrs.inf.br";
const serviceNames = ["USERS", "WHATSAPP", "CUSTOMERS", "FILES", "MARKETING", "AI", "INSTANCES", "REPORTS", "REPORTS_API"];
const environment = { ...process.env, FRONTEND_BASE_PATH: "/nova", NEW_FRONTEND_ORIGIN: "", NEXT_TELEMETRY_DISABLED: "1" };
for (const name of serviceNames) environment[`NEXT_PUBLIC_${name}_URL`] = publicOrigin;
environment.NEXT_PUBLIC_SOCKET_URL = "https://socket.infotecrs.inf.br";

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], {
  cwd: root, env: environment, stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status || 1);

function jsFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? jsFiles(path) : entry.name.endsWith(".js") ? [path] : [];
  });
}
const files = jsFiles(join(root, ".next", "static"));
let loginChunk = false;
let socketConfigured = false;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (/localhost:800[0-8]/.test(text) || /\.env\.NEXT_PUBLIC_(?:USERS|WHATSAPP|CUSTOMERS|FILES|MARKETING|AI|INSTANCES|REPORTS|REPORTS_API|SOCKET)_URL/.test(text)) {
    throw new Error(`Unresolved service URL in ${file}`);
  }
  if (text.includes("/api/auth/login") && text.includes(publicOrigin)) loginChunk = true;
  if (text.includes(environment.NEXT_PUBLIC_SOCKET_URL)) socketConfigured = true;
}
if (!loginChunk || !socketConfigured) throw new Error("Expected public login and socket URLs were not found in browser assets");
console.log("Verified Odim browser assets: public API and socket URLs are embedded.");
