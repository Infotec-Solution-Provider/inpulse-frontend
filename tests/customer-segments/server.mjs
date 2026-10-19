import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/customer-segments/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/lib/sdk-local": `export const UserRole = { ADMIN: 'ADMIN' }`,
  "@/lib/services/customers.service": `export { customersService as default } from '${doubles}'`,
  "@/lib/cache/hybrid-cache": `export { hybridCache } from '${doubles}'`,
  "next/link": `import React from 'react'; export default function Link(props) { return React.createElement('a', props); }`,
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-customer-segments",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-customer-segments",
      enforce: "pre",
      resolveId(source) {
        if (source in stubs) return `\0segments:${source}`;
        if (source.endsWith("/auth-context")) return "\0segments:@/app/auth-context";
        if (source.endsWith("/sdk-local")) return "\0segments:@/lib/sdk-local";
        if (source.endsWith("/customers.service"))
          return "\0segments:@/lib/services/customers.service";
        if (source.endsWith("/hybrid-cache")) return "\0segments:@/lib/cache/hybrid-cache";
      },
      load(id) {
        if (id.startsWith("\0segments:")) return stubs[id.slice("\0segments:".length)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4191,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
