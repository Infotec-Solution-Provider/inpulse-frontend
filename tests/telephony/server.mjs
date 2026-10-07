import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/telephony/doubles.ts";
const stubs = {
  "auth-context": `export { useAuthContext } from '${doubles}'`,
  "whatsapp-context": `export { useWhatsappContext } from '${doubles}'`,
  "users.service": `export { usersService as default } from '${doubles}'`,
  "customers.service": `export { customersService as default } from '${doubles}'`,
  "jssip": `export { UA, WebSocketInterface, debug } from '${doubles}'`,
};
const server = await createServer({
  configFile: false, root, cacheDir: "node_modules/.vite-telephony",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{ name: "isolated-telephony", enforce: "pre",
    resolveId(source) { const name = source.replaceAll("\\", "/").split("/").at(-1)?.replace(/\.tsx?$/, ""); if (name in stubs) return `\0telephony:${name}`; },
    load(id) { if (id.startsWith("\0telephony:")) return stubs[id.slice("\0telephony:".length)]; },
  }],
  server: { host: "127.0.0.1", port: 4184, strictPort: true, hmr: false },
});
await server.listen();
