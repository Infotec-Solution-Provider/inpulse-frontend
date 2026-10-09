import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/channels/doubles.ts";
const names = {
  "auth-context": "AuthContext",
  "app-context": "AppContext",
  "socket-context": "SocketContext",
  "whatsapp-context": "WhatsappContext",
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-channels",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-channels",
      enforce: "pre",
      resolveId(source) {
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in names) return `\0channels:${name}`;
        if (source.endsWith("/sdk-local")) return "\0channels:sdk";
      },
      load(id) {
        if (id === "\0channels:sdk")
          return "export const SocketEventType = { WwebjsSessionStatus: 'session-status' }";
        if (id.startsWith("\0channels:"))
          return `export { ${names[id.slice("\0channels:".length)]} } from '${doubles}'`;
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4191, strictPort: true, hmr: false },
});
await server.listen();
