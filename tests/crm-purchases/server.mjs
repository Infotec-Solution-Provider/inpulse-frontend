import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  runtime = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(runtime.resolve("vite")).href);
const doubles = "/tests/crm-purchases/doubles.ts";
const stubs = {
  auth: `export { useAuthContext } from '${doubles}'`,
  api: `export { CrmPurchasesClient as default } from '${doubles}'`,
  link: "import React from 'react'; export default function Link(props) { return React.createElement('a', props); }",
};
const server = await createServer({
  configFile: false,
  define: { "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://localhost:8002") },
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-crm-purchases",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "crm-purchases-fixture",
      enforce: "pre",
      resolveId(source) {
        if (source.endsWith("/auth-context")) return "\0purchases:auth";
        if (source.endsWith("/crm-purchases.client")) return "\0purchases:api";
        if (source === "next/link") return "\0purchases:link";
      },
      load(id) {
        if (id.startsWith("\0purchases:")) return stubs[id.slice("\0purchases:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4198, strictPort: true, hmr: false },
});
await server.listen();
