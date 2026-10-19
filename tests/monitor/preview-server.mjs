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
  "lazy-notifications-dropdown": `export { TestNotifications as default } from '${doubles}'`,
  "notification-preferences-modal": `export { TestNotificationPreferences as default } from '${doubles}'`,
};
const apiOrigin = "http://127.0.0.1:4190";
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-monitor-preview",
  define: Object.fromEntries(
    [
      "WHATSAPP",
      "CUSTOMERS",
      "USERS",
      "INSTANCES",
      "FILES",
      "SOCKET",
      "REPORTS",
      "MARKETING",
      "AI",
    ].map((name) => [`process.env.NEXT_PUBLIC_${name}_URL`, JSON.stringify(apiOrigin)]),
  ),
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-monitor-preview",
      enforce: "pre",
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url === "/") {
            res.writeHead(302, { Location: "/tests/monitor/preview.html" });
            res.end();
            return;
          }
          if (req.url?.startsWith("/api/")) {
            res.writeHead(501, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ message: "Esta prévia não encaminha requests a serviços reais." }),
            );
            return;
          }
          next();
        });
      },
      resolveId(source) {
        if (source === "next/navigation") return "\0monitor-preview:navigation";
        if (source === "next/link") return "\0monitor-preview:next-link";
        if (source === "next/image") return "\0monitor-preview:next-image";
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return `\0monitor-preview:${name}`;
      },
      load(id) {
        if (id === "\0monitor-preview:navigation")
          return "export { usePathname, useSearchParams } from '/tests/monitor/navigation-doubles.tsx'";
        if (id === "\0monitor-preview:next-link")
          return "export { TestLink as default } from '/tests/monitor/navigation-doubles.tsx'";
        if (id === "\0monitor-preview:next-image")
          return "export { TestImage as default } from '/tests/monitor/navigation-doubles.tsx'";
        if (id.startsWith("\0monitor-preview:"))
          return stubs[id.slice("\0monitor-preview:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4190, strictPort: true, hmr: false },
});
await server.listen();
console.log("Prévia local com dados fictícios: http://127.0.0.1:4190/tests/monitor/preview.html");
