import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const server = await createServer({
  configFile: false,
  root,
  cacheDir: "node_modules/.vite-reports-20261117",
  resolve: {
    alias: [
      { find: "@/app/auth-context", replacement: `${root}/tests/reports/auth-stub.tsx` },
      {
        find: "@/app/(private)/[instance]/whatsapp-context",
        replacement: `${root}/tests/reports/whatsapp-stub.ts`,
      },
      {
        find: "@/app/(private)/[instance]/socket-context",
        replacement: `${root}/tests/reports/socket-stub.ts`,
      },
      { find: "next/link", replacement: `${root}/tests/reports/link-stub.tsx` },
      { find: "next/navigation", replacement: `${root}/tests/reports/navigation-stub.ts` },
      { find: "@", replacement: `${root}/src` },
    ],
  },
  optimizeDeps: { entries: ["tests/reports/index.html"] },
  define: {
    "process.env": JSON.stringify({
      NEXT_PUBLIC_WHATSAPP_URL: "http://fixture-whatsapp",
      NEXT_PUBLIC_USERS_URL: "http://fixture-users",
      NEXT_PUBLIC_MARKETING_URL: "http://fixture-marketing",
      NEXT_PUBLIC_REPORTS_URL: "http://fixture-reports",
      NEXT_PUBLIC_FILES_URL: "http://fixture-files",
      NEXT_PUBLIC_REPORTS_API_URL: "http://fixture-reports",
      NEXT_PUBLIC_FRONTEND_BASE_PATH: "",
    }),
  },
  server: { host: "127.0.0.1", port: 4217, strictPort: true, hmr: false },
});
await server.listen();
