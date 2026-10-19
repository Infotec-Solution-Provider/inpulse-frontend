import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json")),
  { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href),
  root = fileURLToPath(new URL("../../", import.meta.url)),
  doubles = "/tests/crm-marketing/doubles.ts";
const stubs = {
  auth: `export { useAuthContext } from '${doubles}'`,
  client: `export { MarketingClient as default } from '${doubles}'`,
  generation: `export { GenerationClient as default } from '${doubles}'`,
  link: "import React from 'react'; export default function Link(props) { return React.createElement('a', props); }",
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-crm-marketing",
  define: {
    "process.env.NEXT_PUBLIC_MARKETING_URL": JSON.stringify("http://fixture-marketing"),
    "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://fixture-customers"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-crm-marketing",
      enforce: "pre",
      resolveId(source) {
        if (source.endsWith("/auth-context")) return "\0crm:auth";
        if (source.endsWith("/crm-marketing.client")) return "\0crm:client";
        if (source.endsWith("/crm-campaign-generation.client")) return "\0crm:generation";
        if (source === "next/link") return "\0crm:link";
      },
      load(id) {
        if (id.startsWith("\0crm:")) return stubs[id.slice(5)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4197,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
