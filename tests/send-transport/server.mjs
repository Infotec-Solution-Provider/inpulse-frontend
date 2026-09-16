import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/send-transport/doubles.ts";
const stubs = {
  "auth-context": `export { AuthContext, useAuthContext } from '${doubles}'`,
  "socket-context": `export { SocketContext } from '${doubles}'`,
  "internal-context": `export { InternalChatContext } from '${doubles}'`,
  "react-toastify": `export { toast } from '${doubles}'`,
  "@in.pulse-crm/utils": `export { Logger, Formatter, sanitizeErrorMessage } from '${doubles}'`,
};
const server = await createServer({
  configFile: false, root,
  cacheDir: "node_modules/.vite-send-transport",
  define: {
    "process.env.NEXT_PUBLIC_WHATSAPP_URL": JSON.stringify("http://127.0.0.1:4182"),
    "process.env.NEXT_PUBLIC_FILES_URL": JSON.stringify("http://127.0.0.1:4182"),
    "process.env.NEXT_PUBLIC_USERS_URL": JSON.stringify("http://127.0.0.1:4182"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{
    name: "isolated-non-send-contexts", enforce: "pre",
    resolveId(source) {
      const name = source in stubs ? source : source.replaceAll("\\", "/").split("/").at(-1)?.replace(/\.tsx?$/, "");
      if (name in stubs) return `\0send-transport:${name}`;
    },
    load(id) { if (id.startsWith("\0send-transport:")) return stubs[id.slice("\0send-transport:".length)]; },
  }],
  server: { host: "127.0.0.1", port: 4182, strictPort: true, hmr: false },
});
await server.listen();
