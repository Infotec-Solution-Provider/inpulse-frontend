import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url), vr = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const doubles = "/tests/frontend-flags/doubles.ts";
const stubs = {
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/app/(private)/[instance]/whatsapp-context": `export { useWhatsappContext } from '${doubles}'`,
  "next/navigation": `export const useRouter = () => ({push: url => location.assign(url), replace: url => location.replace(url)}); export const useSearchParams = () => new URLSearchParams(location.search); export { usePathname } from '${doubles}'`,
};
const server = await createServer({
  configFile: false, root: fileURLToPath(new URL("../../", import.meta.url)),
  define: {
    "process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH": '(window.location.pathname.startsWith("/nova/") ? "/nova" : "")',
    "process.env.NEXT_PUBLIC_NEW_FRONTEND_ENABLED": JSON.stringify("true"),
  },
  cacheDir: "node_modules/.vite-frontend-flags",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [{ name: "isolated-frontend-flags", enforce: "pre",
    configureServer(server) { server.middlewares.use((req, res, next) => {
      if (/^\/(?:nova\/)?odim(?:\?|$)/.test(req.url || "")) req.url = "/tests/frontend-flags/index.html";
      next();
    }); },
    resolveId(source) {
      if (source in stubs) return "\0flags:" + source;
      for (const key of Object.keys(stubs)) if (key.startsWith("@/") && source.replaceAll("\\", "/").endsWith(key.replace("@/", "/src/"))) return "\0flags:" + key;
    },
    load(id) { if (id.startsWith("\0flags:")) return stubs[id.slice(7)]; },
  }], server: { host: "127.0.0.1", port: 4206, strictPort: true, hmr: false },
});
await server.listen();
