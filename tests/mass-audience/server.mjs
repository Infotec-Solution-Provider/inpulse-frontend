import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json")),
  { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const server = await createServer({
  configFile: false,
  root,
  css: {
    postcss: {
      plugins: [
        require("tailwindcss")({
          config: fileURLToPath(new URL("../../tailwind.config.ts", import.meta.url)),
        }),
      ],
    },
  },
  cacheDir: "node_modules/.vite-mass-audience",
  define: Object.fromEntries(
    ["WHATSAPP", "CUSTOMERS", "MARKETING"].map((name) => [
      `process.env.NEXT_PUBLIC_${name}_URL`,
      JSON.stringify("http://127.0.0.1:4206"),
    ]),
  ),
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-mass-audience",
      enforce: "pre",
      resolveId(source) {
        if (source.endsWith("/auth-context")) return "\0mass:auth";
        if (source.endsWith("/whatsapp-context")) return "\0mass:whatsapp";
        if (source === "next/navigation") return "\0mass:nav";
        if (source === "next/link") return "\0mass:link";
      },
      load(id) {
        if (id === "\0mass:auth")
          return "export {AuthContext,useAuthContext} from '/tests/mass-audience/doubles.tsx'";
        if (id === "\0mass:whatsapp")
          return "export {WhatsappContext} from '/tests/mass-audience/doubles.tsx'";
        if (id === "\0mass:nav")
          return "export {usePathname,useSearchParams} from '/tests/monitor/navigation-doubles.tsx'";
        if (id === "\0mass:link")
          return "export {TestLink as default} from '/tests/monitor/navigation-doubles.tsx'";
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith("/api/")) return next();
          res.statusCode = 501;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              message: "An API fixture is required; no real service is available in this harness.",
            }),
          );
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4206,
    strictPort: true,
    hmr: false,
    fs: { allow: [fileURLToPath(new URL("../../../", import.meta.url))] },
  },
});
await server.listen();
