import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const server = await createServer({
  configFile: false,
  define: { "process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH": JSON.stringify(""), "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://127.0.0.1:4196") },
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-crm-imports",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-import-auth",
      enforce: "pre",
      resolveId(source) {
        if (source === "@/app/auth-context" || source.endsWith("/auth-context"))
          return "\0import-auth";
      },
      load(id) {
        if (id === "\0import-auth")
          return `export {useAuthContext} from '/tests/crm-imports/auth.ts'`;
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4196,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
