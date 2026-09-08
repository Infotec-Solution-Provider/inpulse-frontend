import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const source = readFileSync(resolve("src/lib/utils/chat-draft-store.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const script = `(() => { const exports = {}; ${compiled}; window.chatDraftStore = exports; })();`;

test("restores attachment bytes and retry identity after reload, isolated by user and chat", async ({
  page,
}) => {
  await page.route("http://draft-test.local/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body>Draft persistence test</body></html>",
    }),
  );
  await page.goto("http://draft-test.local/");
  await page.addScriptTag({ content: script });
  await page.evaluate(async () => {
    await (window as any).chatDraftStore.saveChatDraft("tenant/user-1/chat-3", {
      text: "Keep this caption",
      file: new File(["exact attachment bytes"], "evidence.txt", { type: "text/plain" }),
      attemptKey: "same-intention-after-timeout",
      attemptClientId: 5,
      sendAsAudio: false,
      sendAsDocument: true,
      isEmojiMenuOpen: false,
    });
  });
  await page.reload();
  await page.addScriptTag({ content: script });
  const restored = await page.evaluate(async () => {
    const store = (window as any).chatDraftStore;
    const draft = await store.loadChatDraft("tenant/user-1/chat-3");
    return {
      text: draft.text,
      name: draft.file.name,
      content: await draft.file.text(),
      key: draft.attemptKey,
      otherUser: await store.loadChatDraft("tenant/user-2/chat-3"),
      otherChat: await store.loadChatDraft("tenant/user-1/chat-4"),
    };
  });
  expect(restored).toEqual({
    text: "Keep this caption",
    name: "evidence.txt",
    content: "exact attachment bytes",
    key: "same-intention-after-timeout",
    otherUser: undefined,
    otherChat: undefined,
  });
});

test("ordered writes preserve the latest draft and confirmed empty drafts are deleted", async ({
  page,
}) => {
  await page.route("http://draft-test.local/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body>Draft persistence test</body></html>",
    }),
  );
  await page.goto("http://draft-test.local/");
  await page.addScriptTag({ content: script });
  await page.evaluate(async () => {
    const store = (window as any).chatDraftStore;
    const base = { sendAsAudio: false, sendAsDocument: false, isEmojiMenuOpen: false };
    await Promise.all([
      store.saveChatDraft("draft", { ...base, text: "older" }),
      store.saveChatDraft("draft", { ...base, text: "latest" }),
    ]);
  });
  await page.reload();
  await page.addScriptTag({ content: script });
  expect(
    await page.evaluate(
      async () => (await (window as any).chatDraftStore.loadChatDraft("draft")).text,
    ),
  ).toBe("latest");
  await page.evaluate(async () => {
    await (window as any).chatDraftStore.saveChatDraft("draft", {
      text: "",
      sendAsAudio: false,
      sendAsDocument: false,
      isEmojiMenuOpen: false,
    });
  });
  await page.reload();
  await page.addScriptTag({ content: script });
  expect(
    await page.evaluate(async () => (window as any).chatDraftStore.loadChatDraft("draft")),
  ).toBeUndefined();
});
