import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(vitestRequire.resolve("vite")).href);
const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const doubles = "/tests/channel-selection/doubles.tsx";
const stubs = {
  "whatsapp-context": `export { useWhatsappContext } from '${doubles}'`,
  "chat-context": `export { ChatContext } from '${doubles}'`,
  "contacts-context": `export const useContactsContext = () => ({ state: { contacts: [] } })`,
  "app-context": `export const useAppContext = () => ({ openModal() {}, closeModal() {} })`,
  "internal-context": `export default function useInternalChatContext() { return { users: [] } }`,
  QuickMessage: `export const QuickMessage = () => null`,
  "send-template-modal": `export default () => null`,
  "audio-recorder": `export default () => null`,
  "emoji-picker-react": `export default () => null; export const Theme = {}; export const EmojiStyle = {}; export const SuggestionMode = {}`,
};
const server = await createServer({
  define: { "process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH": JSON.stringify("") },
  configFile: false,
  root,
  esbuild: { jsx: "automatic" },
  cacheDir: "node_modules/.vite-channel-selection",
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  plugins: [
    {
      name: "isolated-channel-selection",
      enforce: "pre",
      resolveId(source) {
        const name = source
          .replaceAll("\\", "/")
          .split("/")
          .at(-1)
          ?.replace(/\.tsx?$/, "");
        if (name in stubs) return `\0channel-selection:${name}`;
      },
      load(id) {
        if (id.startsWith("\0channel-selection:"))
          return stubs[id.slice("\0channel-selection:".length)];
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4199, strictPort: true, hmr: false },
});
await server.listen();
