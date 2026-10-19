import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
const doubles = "/tests/crm-users/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/lib/sdk-local":
    "export const UserRole = { ADMIN: 'ADMIN' }; export const FileDirType = { PUBLIC: 'PUBLIC' }",
  "@/lib/services/customers.service": `export { customersService as default } from '${doubles}'`,
  "@/lib/services/crm-users.service": `export { crmUsersService as default } from '${doubles}'`,
  "@/lib/services/files.service": `export { filesService as default } from '${doubles}'`,
  "users-context": `export { useUsersContext } from '${doubles}'`,
  "next/link":
    "import React from 'react'; export default function Link(props) { return React.createElement('a', props); }",
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-crm-users",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-crm-users",
      enforce: "pre",
      resolveId(source) {
        if (source in stubs) return `\0catalogs:${source}`;
        if (source.endsWith("/auth-context")) return "\0catalogs:@/app/auth-context";
        if (source.endsWith("/users-context")) return "\0catalogs:users-context";
        if (source.endsWith("/sdk-local")) return "\0catalogs:@/lib/sdk-local";
        if (source.endsWith("/customers.service"))
          return "\0catalogs:@/lib/services/customers.service";
        if (source.endsWith("/crm-users.service"))
          return "\0catalogs:@/lib/services/crm-users.service";
        if (source.endsWith("/files.service")) return "\0catalogs:@/lib/services/files.service";
      },
      load(id) {
        if (id.startsWith("\0catalogs:")) return stubs[id.slice("\0catalogs:".length)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4195,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
