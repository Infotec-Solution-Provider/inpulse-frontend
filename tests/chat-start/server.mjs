import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/chat-start/doubles.tsx";
const stubs = {
  "whatsapp-context": `export { WhatsappContext, useWhatsappContext } from '${doubles}'`,
  "app-context": `export { useAppContext } from '${doubles}'`,
  "auth-context": `export const useAuthContext = () => ({ instance: 'fixture', user: { NOME: 'Operador de teste' } })`,
  "customer-crm-detail-modal": "export default () => null",
  "sdk-local": "export const WppChatPriority = { NORMAL: 'NORMAL' }; export const WppChatType = { ACTIVE: 'ACTIVE' }",
};
const server = await createServer({
  configFile: false,
  root,
  esbuild: { jsx: "automatic" },
  cacheDir: "node_modules/.vite-chat-start",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{
    name: "isolated-chat-start",
    enforce: "pre",
    resolveId(source) {
      const name = source.replaceAll("\\", "/").split("/").at(-1)?.replace(/\.tsx?$/, "");
      if (name in stubs) return `\0chat-start:${name}`;
    },
    load(id) {
      if (id.startsWith("\0chat-start:")) return stubs[id.slice("\0chat-start:".length)];
    },
  }],
  server: { host: "127.0.0.1", port: 4202, strictPort: true, hmr: false },
});
await server.listen();
