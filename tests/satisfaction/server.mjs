import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url),
  vr = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vr.resolve("vite")).href);
const doubles = "/tests/satisfaction/doubles.ts";
const stubs = {
  "@/lib/sdk-local/crm-proposals.client": `export { FakeProposalsClient as default } from '${doubles}'`,
  "@/app/auth-context": `export { useAuthContext } from '${doubles}'`,
  "@/app/(private)/[instance]/app-context": `export { useAppContext } from '${doubles}'`,
  "@/app/(private)/[instance]/whatsapp-context": `export { useWhatsappContext } from '${doubles}'`,
  "@/lib/services/customers.service": `export { customersService as default } from '${doubles}'`,
  "@/lib/ui-system": `import React from 'react';export function CrmPage({title,children}){return React.createElement('main',null,React.createElement('h1',null,title),children)}`,
  "@in.pulse-crm/utils": `export const Formatter={phone:value=>value};export const sanitizeErrorMessage=value=>String(value)`,
  scope: `export default function useChatActionScope(){return {valid:true,isActive:()=>true}}`,
};
const server = await createServer({
  configFile: false,
  define: { "process.env.NEXT_PUBLIC_CUSTOMERS_URL": JSON.stringify("http://fixture.invalid") },
  root: fileURLToPath(new URL("../../", import.meta.url)),
  cacheDir: "node_modules/.vite-satisfaction",
  css: {
    postcss: {
      plugins: [
        require("tailwindcss")({
          content: [
            {
              raw: readFileSync(
                new URL(
                  "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-finish-modal.tsx",
                  import.meta.url,
                ),
                "utf8",
              ),
              extension: "tsx",
            },
          ],
          corePlugins: { preflight: false },
        }),
      ],
    },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-satisfaction",
      enforce: "pre",
      resolveId(source) {
        if (source in stubs) return "\0satisfaction:" + source;
        for (const key of Object.keys(stubs)) {
          if (
            key.startsWith("@/") &&
            source.replaceAll("\\", "/").endsWith(key.replace("@/", "/src/"))
          )
            return "\0satisfaction:" + key;
        }
        if (source.endsWith("use-chat-action-scope")) return "\0satisfaction:scope";
      },
      load(id) {
        if (id.startsWith("\0satisfaction:")) return stubs[id.slice("\0satisfaction:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4198, strictPort: true, hmr: false },
});
await server.listen();
