import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/telephony-finish/doubles.tsx";
const stubs = {
  "auth-context": `export {AuthContext,useAuthContext} from '${doubles}'`,
  "app-context": `export {AppContext,useAppContext} from '${doubles}'`,
  "whatsapp-context": `export {useWhatsappContext} from '${doubles}'`,
  "customers.service": `export {customersService as default} from '${doubles}'`,
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-telephony-finish",
  define: {
    "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://127.0.0.1:4186"),
    "process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH": JSON.stringify(""),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "finish-fixture",
      enforce: "pre",
      resolveId(source) {
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return "\0finish:" + name;
      },
      load(id) {
        if (id.startsWith("\0finish:")) return stubs[id.slice("\0finish:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4186, strictPort: true, hmr: false },
});
await server.listen();
