import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/reactions/doubles.ts";
// Keep the actual renderer, message, selector, confirmation hook and HTTP client.
// Only unrelated app services and media dependencies are isolated.
const stubs = {
  "auth-context": `export { AuthContext } from '${doubles}'`,
  "whatsapp-context": `export { WhatsappContext, useWhatsappContext } from '${doubles}'`,
  "chat-context": `export { ChatContext } from '${doubles}'`,
  "react-toastify": `export { toast } from '${doubles}'`,
  "message-file": "export default function MessageFile() { return null; }",
  "vcard-message": "export default function VCardMessage() { return null; }",
};
const server = await createServer({
  define: { "process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH": JSON.stringify("") },
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-reactions",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{
    name: "isolated-reaction-services",
    enforce: "pre",
    resolveId(source) {
      const name = source.replaceAll("\\", "/").split("/").at(-1)?.replace(/\.tsx?$/, "");
      if (name in stubs) return `\0reaction-test:${name}`;
    },
    load(id) {
      if (id.startsWith("\0reaction-test:")) return stubs[id.slice("\0reaction-test:".length)];
    },
  }],
  server: { host: "127.0.0.1", port: 4197, strictPort: true, hmr: false },
});
await server.listen();
