import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const server = await createServer({
  configFile: false, root, cacheDir: "node_modules/.vite-session-changes",
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 4198, strictPort: true, hmr: false },
});
await server.listen();
