import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-schedules",
  define: {
    "process.env.NEXT_PUBLIC_WHATSAPP_URL": JSON.stringify("http://127.0.0.1:4193"),
    "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://127.0.0.1:4193"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-schedules",
      enforce: "pre",
      resolveId(source) {
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name === "auth-context" || name === "whatsapp-context") return `\0schedules:${name}`;
      },
      load(id) {
        if (id === "\0schedules:auth-context")
          return "export {AuthContext,useAuthContext} from '/tests/schedules/doubles.ts'";
        if (id === "\0schedules:whatsapp-context")
          return "export {WhatsappContext,useWhatsappContext} from '/tests/schedules/doubles.ts'";
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4193, strictPort: true, hmr: false },
});
await server.listen();
