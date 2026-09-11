import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// Reuse Vite from the existing Vitest installation, without starting Next or real services.
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
// Tailwind resolves the shared application config relative to the process cwd.
process.chdir(root);
const doubles = "/tests/chat-send/doubles.ts";
const stubs = {
  "auth-context": `export { AuthContext } from '${doubles}'`,
  "whatsapp-context": `export { WhatsappContext } from '${doubles}'`,
  "internal-context": `export { InternalChatContext } from '${doubles}'`,
  "react-toastify": `export { toast } from '${doubles}'`,
};

const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{
    name: "isolated-chat-services",
    enforce: "pre",
    resolveId(source) {
      const normalized = source.replaceAll("\\", "/");
      const name = normalized.split("/").at(-1)?.replace(/\.tsx?$/, "");
      if (name in stubs) return `\0chat-send-test:${name}`;
    },
    load(id) {
      if (id.startsWith("\0chat-send-test:")) return stubs[id.slice("\0chat-send-test:".length)];
    },
  }],
  server: { host: "127.0.0.1", port: 4181, strictPort: true, hmr: false },
});
await server.listen();
