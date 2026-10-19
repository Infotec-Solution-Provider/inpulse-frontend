import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/contact-quality/doubles.ts";
const server = await createServer({
  configFile: false, root, cacheDir: "node_modules/.vite-contact-quality",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{ name: "contact-quality-fixtures", enforce: "pre",
    resolveId(source) {
      if (source.endsWith("/app-context")) return "\0contact:app";
      if (source.endsWith("/whatsapp-context")) return "\0contact:whatsapp";
      if (source.endsWith("/customers-context")) return "\0contact:customers";
    },
    load(id) {
      if (id === "\0contact:app") return `export { useAppContext } from '${doubles}'`;
      if (id === "\0contact:whatsapp") return `export { useWhatsappContext } from '${doubles}'`;
      if (id === "\0contact:customers") return `export { useCustomersContext } from '${doubles}'`;
    }
  }],
  server: { host: "127.0.0.1", port: 4196, strictPort: true, hmr: false, fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] } },
});
await server.listen();
