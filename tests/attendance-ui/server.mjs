import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/attendance-ui/doubles.tsx";
const stubs = {
  "auth-context": `export {AuthContext,useAuthContext} from '${doubles}'`,
  "app-context": `export {AppContext,useAppContext} from '${doubles}'`,
  "whatsapp-context": `export {WhatsappContext,useWhatsappContext} from '${doubles}'`,
  "whatsapp-chat-list-context": `export {useWhatsappChatList} from '${doubles}'`,
  "whatsapp-session-context": `export {useWhatsappSession} from '${doubles}'`,
  "internal-context": `export {InternalChatContext,useInternalChatContext as default} from '${doubles}'`,
  "contacts-context": `export {ContactsContext,useContactsContext} from '${doubles}'`,
  "files.service": `export {filesService as default} from '${doubles}'`,
  "customers.service": `export {customersService as default} from '${doubles}'`,
  "users.service": `export {usersService as default} from '/tests/telephony/doubles.ts'`,
  jssip: `export {UA,WebSocketInterface,debug} from '/tests/telephony/doubles.ts'`,
  "react-toastify": `export {toast} from '${doubles}'`,
  "ai-prototype-modal": `export {Empty as default} from '${doubles}'`,
  "agent-audit-drawer": `export {Empty as default} from '${doubles}'`,
  "customer-crm-detail-modal": `export {Empty as default} from '${doubles}'`,
  "send-template-modal": `export {Empty as default} from '${doubles}'`,
  QuickMessage: `export {Empty as QuickMessage} from '${doubles}'`,
  "lazy-notifications-dropdown": `export {Empty as default} from '${doubles}'`,
  "notification-preferences-modal": `export {Empty as default} from '${doubles}'`,
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-attendance-ui",
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
    ].map((name) => [
      `process.env.NEXT_PUBLIC_${name}_URL`,
      JSON.stringify("http://127.0.0.1:4210"),
    ]),
  ),
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-attendance-ui",
      enforce: "pre",
      resolveId(source) {
        if (source === "next/navigation") return "\0attendance:next-navigation";
        if (source === "next/link") return "\0attendance:next-link";
        if (source === "next/image") return "\0attendance:next-image";
        if (source === "next/dynamic") return "\0attendance:dynamic";
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return `\0attendance:${name}`;
      },
      load(id) {
        if (id === "\0attendance:next-navigation")
          return `export {usePathname,useSearchParams} from '/tests/monitor/navigation-doubles.tsx';import {navigate} from '/tests/monitor/navigation-doubles.tsx';export function useRouter(){return {push:navigate,replace:navigate}};export function useParams(){return {instance:'tenant-a'}};`;
        if (id === "\0attendance:next-link")
          return `export {TestLink as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id === "\0attendance:next-image")
          return `export {TestImage as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id === "\0attendance:dynamic")
          return `export default function dynamic(){return ()=>null}`;
        if (id.startsWith("\0attendance:")) return stubs[id.slice("\0attendance:".length)];
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith("/api/")) return next();
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ code: "ISOLATED_FIXTURE_NO_API" }));
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4210, strictPort: true, hmr: false },
});
await server.listen();
