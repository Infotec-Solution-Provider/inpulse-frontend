import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/parameters/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/lib/sdk-local": `export const UserRole = { ADMIN: 'ADMIN' }`,
  "@/lib/services/parameter-settings.service": `export { parameterSettingsService as default } from '${doubles}'`,
};
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-parameters",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-parameters",
      enforce: "pre",
      resolveId(source) {
        if (source in stubs) return `\0parameters:${source}`;
        if (source.endsWith("/auth-context")) return "\0parameters:@/app/auth-context";
        if (source.endsWith("/sdk-local")) return "\0parameters:@/lib/sdk-local";
        if (source.endsWith("/parameter-settings.service"))
          return "\0parameters:@/lib/services/parameter-settings.service";
        if (source.endsWith("/whatsapp-context")) return "\0parameters:whatsapp";
      },
      load(id) {
        if (id === "\0parameters:whatsapp")
          return `export { useWhatsappContext } from '${doubles}'`;
        if (id.startsWith("\0parameters:")) return stubs[id.slice("\0parameters:".length)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4187,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
