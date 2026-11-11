import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./admin-console", import.meta.url)),
  base: "/infotec/admin/",
  publicDir: false,
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    {
      name: "independent-admin-boundary",
      enforce: "pre",
      resolveId(source) {
        if (source.startsWith("next/") || source.startsWith("@/app/"))
          throw new Error(`O console administrativo não pode depender do Next: ${source}`);
      },
      transform(code, id) {
        if (id.replaceAll("\\", "/").endsWith("/src/lib/ui-system/pilot.css"))
          return code.replace(
            "/fonts/inter/InterVariable.woff2",
            "../../../public/fonts/inter/InterVariable.woff2",
          );
      },
    },
  ],
  build: { outDir: "../dist-admin", emptyOutDir: true, sourcemap: false },
  server: { host: "127.0.0.1", port: 4193, strictPort: true },
});
