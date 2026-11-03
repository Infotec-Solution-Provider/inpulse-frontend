import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-crm-email",
  optimizeDeps: { entries: ["tests/crm-email/index.html"] },
  define: { "process.env.NEXT_PUBLIC_MARKETING_URL": JSON.stringify("http://email.fixture") },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "email-isolated-auth",
      enforce: "pre",
      resolveId(source) {
        if (source.endsWith("/auth-context")) return "\0email:auth";
      },
      load(id) {
        if (id === "\0email:auth")
          return "export function useAuthContext(){return {token:'test-token',instance:'tenant-a',user:{NIVEL:'ADMIN'}}}";
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4213, strictPort: true, hmr: false },
});
await server.listen();
