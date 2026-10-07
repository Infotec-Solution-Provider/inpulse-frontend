import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/monitor/doubles.ts";
const stubs = {
  "auth-context": `export { AuthContext, useAuthContext } from '${doubles}'`,
  "whatsapp-context": `export { WhatsappContext, useWhatsappContext } from '${doubles}'`,
  "internal-context": `export { InternalChatContext, useInternalChatContext as default } from '${doubles}'`,
  "socket-context": `export { SocketContext } from '${doubles}'`,
  "app-context": `export { AppContext } from '${doubles}'`,
  "files.service": "export default {getFileDownloadUrl: () => ''}",
  message: `export { TestMessage as default } from '${doubles}'`,
  "group-message": `export { TestMessage as default } from '${doubles}'`,
  "chat-messages-list": `export { TestMessages as default } from '${doubles}'`,
  "chat-send-message-area": `export { TestComposer as default } from '${doubles}'`,
  "customer-crm-detail-modal": `export { TestCustomerDetail as default } from '${doubles}'`,
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-monitor",
  define: {
    "process.env.NEXT_PUBLIC_WHATSAPP_URL": JSON.stringify("http://127.0.0.1:4185"),
    "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://127.0.0.1:4185"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-monitor",
      enforce: "pre",
      resolveId(source) {
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return `\0monitor:${name}`;
      },
      load(id) {
        if (id.startsWith("\0monitor:")) return stubs[id.slice("\0monitor:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4185, strictPort: true, hmr: false },
});
await server.listen();
