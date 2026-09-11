import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// Reuse the Vite version already installed with Vitest.
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
const doubles = "/tests/auth-session/doubles.ts";
const stubs = {
  "next/navigation": `export { usePathname, useRouter } from '${doubles}'`,
  "react-toastify": `export { toast } from '${doubles}'`,
  "@in.pulse-crm/utils": `export { sanitizeErrorMessage } from '${doubles}'`,
  "../lib/services/auth.service": `export { authService as default } from '${doubles}'`,
  "../lib/services/users.service": `export { usersService as default } from '${doubles}'`,
};

const server = await createServer({
  configFile: false,
  root,
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{
    name: "isolated-auth-services",
    enforce: "pre",
    resolveId(source) {
      if (source in stubs) return `\0auth-session-test:${source}`;
      for (const service of ["auth", "users"]) {
        if (new RegExp(`/lib/services/${service}\\.service(?:\\.ts)?$`).test(source.replaceAll("\\", "/"))) {
          return `\0auth-session-test:../lib/services/${service}.service`;
        }
      }
    },
    load(id) {
      if (id.startsWith("\0auth-session-test:")) return stubs[id.slice("\0auth-session-test:".length)];
    },
  }],
  server: { host: "127.0.0.1", port: 4179, strictPort: true },
});
await server.listen();
