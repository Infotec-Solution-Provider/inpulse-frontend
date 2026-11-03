import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
const require = createRequire(import.meta.url),
  vitestRequire = createRequire(require.resolve("vitest/package.json")),
  { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const stubs = {
  auth: "export {useAuthContext} from '/tests/crm-administration/doubles.ts'",
  navigation:
    "export {usePathname,useSearchParams} from '/tests/monitor/navigation-doubles.tsx';import {navigate} from '/tests/monitor/navigation-doubles.tsx';export function useRouter(){return {push:navigate,replace:navigate}}",
  link: "import React from 'react';export default function Link(props){return React.createElement('a',props)}",
};
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: ".cache/crm-administration-vite",
  define: { "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://127.0.0.1:4198") },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-administration",
      enforce: "pre",
      resolveId(source) {
        if (source.endsWith("/auth-context")) return "\0admin:auth";
        if (source === "next/navigation") return "\0admin:navigation";
        if (source === "next/link") return "\0admin:link";
      },
      load(id) {
        if (id.startsWith("\0admin:")) return stubs[id.slice(7)];
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4198,
    strictPort: true,
    hmr: false,
    fs: {
      allow: [
        fileURLToPath(new URL("../../../", import.meta.url)),
        realpathSync(new URL("../../node_modules", import.meta.url)),
      ],
    },
  },
});
await server.listen();
