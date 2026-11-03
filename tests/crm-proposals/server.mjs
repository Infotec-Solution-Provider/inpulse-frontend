import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const doubles = "/tests/crm-proposals/doubles.ts";
const stubs = {
  "@/app/auth-context": `export {useAuthContext} from '${doubles}'`,
  "@/app/app-context": `export {useAppContext} from '${doubles}'`,
  "@/lib/sdk-local/crm-proposals.client": `export {FakeProposalsClient as default} from '${doubles}'`,
  "@/lib/customer-segments-error": `export const getCustomerSegmentsError=e=>({status:e?.response?.status,code:e?.response?.data?.code,outcome:e?.response?.data?.outcome})`,
};
const server = await createServer({
  configFile: false,
  esbuild: { jsx: "automatic" },
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: ".next/proposals-vite",
  define: {
    "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://fixture.invalid"),
    "process.env.NEXT_PUBLIC_REPORTS_URL": JSON.stringify("http://fixture.invalid"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-proposals",
      enforce: "pre",
      resolveId(source) {
        for (const key of Object.keys(stubs)) {
          if (source.replace(/\.tsx?$/, "").endsWith(key.slice(1))) return `\0proposals:${key}`;
        }
        if (source in stubs) return `\0proposals:${source}`;
        if (source.endsWith("use-chat-action-scope")) return "\0scope";
      },
      load(id) {
        if (id.startsWith("\0proposals:")) return stubs[id.slice("\0proposals:".length)];
        if (id === "\0scope") return "export default ()=>({valid:true,isActive:()=>true})";
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4196,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
