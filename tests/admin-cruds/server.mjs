import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json")),
  { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url)),
  d = "/tests/admin-cruds/doubles.tsx";
const modules = {
  "auth-context": "AuthContext,useAuthContext",
  "app-context": "AppContext,useAppContext",
  "whatsapp-context": "WhatsappContext,useWhatsappContext,WPP_BASE_URL",
  "contacts-context": "ContactsContext,useContactsContext",
  "ready-messages-context": "ReadyMessagesContext,useReadyMessagesContext",
  "internal-groups-context": "InternalGroupsContext,useInternalGroupsContext",
  "auto-response.context": "AutoResponseContext,useAutoResponseContext",
  "ai-agents-context": "AiAgentsContext,useAiAgentsContext",
  "message-mention-text": "MentionDirectoryContext,Empty as default",
};
const stubs = {
  ...Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, `export {${v}} from '${d}';`])),
  "internal-context": `export {InternalChatContext,useInternalChatContext as default} from '${d}'`,
  "wallets/context": `export {WalletsContext} from '${d}'`,
  "files.service": `export {filesService as default} from '${d}'`,
  "customers.service": `export {customersService as default} from '${d}'`,
  "marketing.service": `export {marketingService as default} from '${d}'`,
  "sql-reports-context": `export {SqlReportsContext,SqlReportsProvider as default} from '${d}'`,
  "users.service": `export {usersService as default} from '${d}'`,
  "ai.service": `export {aiService as default} from '${d}'`,
  "funnel.service": `export {funnelService as default} from '${d}'`,
  "lazy-notifications-dropdown": `export {Empty as default} from '${d}'`,
  "notification-preferences-modal": `export {Empty as default} from '${d}'`,
  "select-customer-input": `export {FakeCustomerInput as default} from '${d}'`,
};
process.chdir(root);
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-admin-cruds",
  define: Object.fromEntries(
    ["WHATSAPP", "CUSTOMERS", "USERS", "FILES", "AI", "INSTANCES", "MARKETING"].map((key) => [
      `process.env.NEXT_PUBLIC_${key}_URL`,
      JSON.stringify("http://127.0.0.1:4201"),
    ]),
  ),
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "admin-crud-fixtures",
      enforce: "pre",
      resolveId(source, importer) {
        if (source.endsWith("/reports/api")) return "\0preview:reports-api";
        if (source === "next/navigation") return "\0preview:navigation";
        if (source === "next/link") return "\0preview:link";
        if (source === "next/image") return "\0preview:image";
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (
          source.includes("wallets/context") ||
          (source.endsWith("/context") && importer?.replaceAll("\\", "/").includes("/wallets/"))
        )
          return "\0preview:wallets/context";
        if (name in stubs) return "\0preview:" + name;
      },
      load(id) {
        if (id === "\0preview:reports-api")
          return `export {getMetrics,deleteMetric,getDashboards,createDashboard,getDashboard,addDashboardItem,removeDashboardItem,executeDashboard,getTables,createMetric,listGeneratedReports} from '${d}';`;
        if (id === "\0preview:navigation")
          return `export {usePathname,useSearchParams} from '/tests/monitor/navigation-doubles.tsx';import {navigate,usePathname} from '/tests/monitor/navigation-doubles.tsx';export function useRouter(){return {push:navigate,replace:navigate,back:()=>navigate('/tenant-a/funnel')}};export function useParams(){return {instance:'tenant-a',funnelId:'1',id:'1'}};`;
        if (id === "\0preview:link")
          return `export {TestLink as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id === "\0preview:image")
          return `export {TestImage as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id.startsWith("\0preview:")) return stubs[id.slice("\0preview:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4201, strictPort: true, hmr: false },
});
await server.listen();
