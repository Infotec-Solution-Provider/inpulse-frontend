import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const doubles = "/tests/crm-registration/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/lib/sdk-local/customer-crm.client": `export { FakeCrmClient as default } from '${doubles}'`,
  "@/lib/cache/hybrid-cache": "export const hybridCache={invalidateResource:async()=>{}}",
  "next/navigation": `export { useRouter } from '${doubles}'`,
};
const server = await createServer({
  configFile: false,
  define: { "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://fixture.invalid") },
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-crm-registration",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-registration",
      enforce: "pre",
      resolveId(source) {
        if (source in stubs) return `\0registration:${source}`;
        if (source.endsWith("/auth-context")) return "\0registration:@/app/auth-context";
        if (source.endsWith("/customer-crm.client"))
          return "\0registration:@/lib/sdk-local/customer-crm.client";
        if (source.endsWith("/hybrid-cache")) return "\0registration:@/lib/cache/hybrid-cache";
      },
      load(id) {
        if (id.startsWith("\0registration:")) return stubs[id.slice("\0registration:".length)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4194,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
