import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const contexts = {
  "auth-context": "export const AuthContext = createContext({ user: null })",
  "contacts-context": "export const ContactsContext = createContext({ state: { contacts: [] } })",
  "internal-context": "export const InternalChatContext = createContext({ users: [] })",
};
const server = await createServer({
  configFile: false,
  root,
  esbuild: { jsx: "automatic" },
  cacheDir: "node_modules/.vite-chat-preferences",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{
    name: "isolated-chat-preferences",
    enforce: "pre",
    resolveId(source) {
      const name = source.replaceAll("\\", "/").split("/").at(-1)?.replace(/\.tsx?$/, "");
      if (name in contexts) return `\0chat-preferences:${name}`;
    },
    load(id) {
      if (id.startsWith("\0chat-preferences:"))
        return `import { createContext } from 'react'; ${contexts[id.slice("\0chat-preferences:".length)]}`;
    },
  }],
  server: { host: "127.0.0.1", port: 4201, strictPort: true, hmr: false },
});
await server.listen();
