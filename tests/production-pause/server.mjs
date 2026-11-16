import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json")),
  { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url)),
  doubles = "/tests/production-pause/doubles.tsx";
const stubs = {
  "auth-context": `export {AuthContext,useAuthContext} from '${doubles}'`,
  "app-context": `export {AppProvider as default,AppContext,useAppContext} from '${doubles}'`,
  "socket-context": `export {Passthrough as default} from '${doubles}'`,
  "whatsapp-context": `export {WppProvider as default,WhatsappContext,useWhatsappContext} from '${doubles}'`,
  "internal-context": `export {InternalChatProvider,InternalChatContext} from '${doubles}'`,
  ...Object.fromEntries(
    [
      "contacts-context",
      "customers-context",
      "ready-messages-context",
      "internal-groups-context",
    ].map((name) => [name, `export {Passthrough as default} from '${doubles}'`]),
  ),
  "notifications-dropdown": `export {Empty as default} from '${doubles}'`,
  "frontend-version-switch": `export {Empty as default} from '${doubles}'`,
  "telephone-attendance-drawer": `export {AttendanceDrawer as default} from '/tests/production-pause/card-doubles.tsx'`,
  "telephone-finish-modal": `export {FinishModal as default} from '/tests/production-pause/card-doubles.tsx'`,
  "cache-warmup": `export {Empty as default} from '${doubles}'`,
  "lazy-notifications-dropdown": `export {Empty as default} from '${doubles}'`,
  "notification-preferences-modal": `export {Empty as default} from '${doubles}'`,
  "users.service": `export {usersService as default} from '/tests/production-pause/phone-doubles.ts'`,
  "customers.service": `export {customersService as default} from '/tests/production-pause/phone-doubles.ts'`,
  jssip: `export {UA,WebSocketInterface,debug} from '/tests/production-pause/phone-doubles.ts'`,
};
const server = await createServer({
  configFile: false,
  root,
  css: {postcss:{plugins:[require("tailwindcss")({...require("tailwindcss/loadConfig")(root+"tailwind.config.ts"),content:[root+"src/**/*.{ts,tsx}",root+"tests/production-pause/**/*.{ts,tsx}"]})]}},
  cacheDir: "node_modules/.vite-production-pause-legacy",
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
      JSON.stringify("http://127.0.0.1:4211"),
    ]),
  ),
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-crm-shell",
      enforce: "pre",
      resolveId(source) {
        if (source === "next/navigation") return "\0crm-shell:next-navigation";
        if (source === "next/link") return "\0crm-shell:next-link";
        if (source === "next/image") return "\0crm-shell:next-image";
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return "\0crm-shell:" + name;
      },
      load(id) {
        if (id === "\0crm-shell:next-navigation")
          return `export {usePathname,useSearchParams} from '/tests/monitor/navigation-doubles.tsx';import {navigate} from '/tests/monitor/navigation-doubles.tsx';export function useRouter(){return {push:navigate,replace:navigate}};export function useParams(){return {instance:'tenant-a'}};`;
        if (id === "\0crm-shell:next-link")
          return `export {TestLink as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id === "\0crm-shell:next-image")
          return `export {TestImage as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id.startsWith("\0crm-shell:")) return stubs[id.slice("\0crm-shell:".length)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4211,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
