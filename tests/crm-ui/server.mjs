import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json")),
  { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url)),
  doubles = "/tests/crm-ui/doubles.tsx";
const stubs = {
  "customer-crm.client": `export {FakeCrmClient as default} from "/tests/crm-registration/doubles.ts"`,
  "crm-users.service": `export {crmUsersService as default} from "/tests/crm-users/doubles.ts"`,
  "files.service": `export {filesService as default} from "/tests/crm-users/doubles.ts"`,
  "auth-context": `export {AuthContext,useAuthContext} from '${doubles}'`,
  "app-context": `export {AppContext,useAppContext} from '${doubles}'`,
  "whatsapp-context": `export {WhatsappContext,useWhatsappContext} from '${doubles}'`,
  "customers.service": `import {customersService as catalogs} from '/tests/crm-catalogs/doubles.ts';import {customersService as segments} from '/tests/customer-segments/doubles.ts';export default {...catalogs,...segments};`,
  "lazy-notifications-dropdown": `export {Empty as default} from '${doubles}'`,
  "notification-preferences-modal": `export {Empty as default} from '${doubles}'`,
};
const rows = Array.from({ length: 31 }, (_, i) => ({
  CODIGO: i + 1,
  RAZAO: `Cliente demonstrativo ${String(i + 1).padStart(2, "0")}`,
  FANTASIA: `Demonstração ${i + 1}`,
  CPF_CNPJ: "00000000000",
  ATIVO: i % 4 ? "SIM" : "NAO",
  PESSOA: "JUR",
  CIDADE: i % 2 ? "Porto Alegre" : "Canoas",
  COD_ERP: String(i + 1).padStart(4, "0"),
  SEGMENTO: 1,
  FONE1: null,
}));
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-crm-ui",
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
      JSON.stringify("http://127.0.0.1:4198"),
    ]),
  ),
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-crm-ui",
      enforce: "pre",
      resolveId(source) {
        if (source === "next/navigation") return "\0crm-ui:next-navigation";
        if (source === "next/link") return "\0crm-ui:next-link";
        if (source === "next/image") return "\0crm-ui:next-image";
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return "\0crm-ui:" + name;
      },
      load(id) {
        if (id === "\0crm-ui:next-navigation")
          return `export {usePathname,useSearchParams} from '/tests/monitor/navigation-doubles.tsx';import {navigate} from '/tests/monitor/navigation-doubles.tsx';export function useRouter(){return {push:navigate,replace:navigate}};export function useParams(){return {instance:'tenant-a'}};`;
        if (id === "\0crm-ui:next-link")
          return `export {TestLink as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id === "\0crm-ui:next-image")
          return `export {TestImage as default} from '/tests/monitor/navigation-doubles.tsx'`;
        if (id.startsWith("\0crm-ui:")) return stubs[id.slice("\0crm-ui:".length)];
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url, "http://127.0.0.1:4198");
          if (!url.pathname.startsWith("/api/")) return next();
          res.setHeader("Content-Type", "application/json");
          if (req.method !== "GET") {
            res.statusCode = 405;
            return res.end(JSON.stringify({ code: "PREVIEW_READ_ONLY" }));
          }
          if (url.pathname === "/api/users") {
            const all = Array.from({ length: 24 }, (_, i) => ({
              CODIGO: 42 + i,
              NOME: i ? `Usuário demonstrativo ${i}` : "Maria",
              LOGIN: `demo${i}`,
              EMAIL: `demo${i}@example.invalid`,
              NIVEL: "ATIVO",
              SETOR: 1,
            })).filter(
              (row) =>
                !url.searchParams.get("NOME") || row.NOME.includes(url.searchParams.get("NOME")),
            );
            const page = Number(url.searchParams.get("page") || 1),
              perPage = Number(url.searchParams.get("perPage") || 10);
            return res.end(
              JSON.stringify({
                data: all.slice((page - 1) * perPage, page * perPage),
                page: { page, perPage, totalRows: all.length },
              }),
            );
          }
          if (url.pathname === "/api/customers") {
            let data = rows.filter(
              (row) =>
                (!url.searchParams.get("RAZAO") ||
                  row.RAZAO.includes(url.searchParams.get("RAZAO"))) &&
                (!url.searchParams.get("CIDADE") ||
                  row.CIDADE === url.searchParams.get("CIDADE")) &&
                (!url.searchParams.get("ATIVO") || row.ATIVO === url.searchParams.get("ATIVO")),
            );
            const page = Number(url.searchParams.get("page") || 1),
              perPage = Number(url.searchParams.get("perPage") || 10);
            return res.end(
              JSON.stringify({
                data: data.slice((page - 1) * perPage, page * perPage),
                page: { totalRows: data.length, page, perPage },
              }),
            );
          }
          res.end(JSON.stringify({ data: [], page: { totalRows: 0, page: 1, perPage: 20 } }));
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4198,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
