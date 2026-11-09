import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url), vr = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const doubles = "/tests/legacy-history/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/app/(private)/[instance]/whatsapp-context": `export { useWhatsappContext } from '${doubles}'`,
  "@/lib/services/files.service": `export default {getFileDownloadUrl: id => 'https://files.example.test/api/files/' + id}`,
};
const port = Number(process.env.LEGACY_HISTORY_TEST_PORT || 4207);
const server = await createServer({
  configFile: false, root: fileURLToPath(new URL("../../", import.meta.url)), cacheDir: `node_modules/.vite-legacy-history-${port}`,
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{ name: "legacy-history-fixtures", enforce: "pre",
    configureServer(server) { server.middlewares.use((req, _res, next) => {
      if (req.url === "/" || req.url?.startsWith("/?")) req.url = "/tests/legacy-history/index.html";
      next();
    }); },
    resolveId(source) {
      if (source.endsWith("/contacts-context")) return "\0history:contacts";
      if (source in stubs) return "\0history:" + source;
      for (const key of Object.keys(stubs)) if (key.startsWith("@/") && source.replaceAll("\\", "/").endsWith(key.replace("@/", "/src/"))) return "\0history:" + key;
    },
    load(id) {
      if (id === "\0history:contacts") return `export {useContactsContext} from '${doubles}'`;
      if (id.startsWith("\0history:")) return stubs[id.slice(9)];
    },
  }], server: { host: "127.0.0.1", port, strictPort: true, hmr: false },
});
await server.listen();
