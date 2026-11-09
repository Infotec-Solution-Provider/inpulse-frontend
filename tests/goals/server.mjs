import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-goals",
  optimizeDeps: { entries: ["tests/goals/index.html"] },
  define: { "process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH": JSON.stringify(""), "process.env.NEXT_PUBLIC_MARKETING_URL": JSON.stringify("http://fixture-marketing") },
  server: { host: "127.0.0.1", port: 4207, strictPort: true, hmr: false },
});
await server.listen();
