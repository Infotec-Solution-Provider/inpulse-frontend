import { describe, expect, it } from "vitest";
import ChatReducer, { ChangeMessageDataAction, SendMessageDataState } from "./chat-reducer";

const state = (): SendMessageDataState => ({
  text: "Hello",
  sendAsAudio: false,
  sendAsDocument: false,
  isEmojiMenuOpen: false,
  quotedId: 7,
  mentions: [{ userId: 2, name: "Ana", phone: "123" }],
});

describe("chat composer state", () => {
  it.each<ChangeMessageDataAction>([
    { type: "attach-file", file: new File(["photo"], "photo.jpg", { type: "image/jpeg" }) },
    { type: "attach-file-id", fileId: 91 },
    { type: "set-audio", file: new File(["audio"], "audio.mp3", { type: "audio/mpeg" }) },
  ])("preserves the quote, mentions and caption when applying $type", (action) => {
    const draft = state();
    const attached = ChatReducer(draft, action);

    expect(attached).toMatchObject({
      text: draft.text,
      quotedId: draft.quotedId,
      mentions: draft.mentions,
    });
    expect(draft).toEqual(state());
  });

  it("replaces an uploaded attachment with a local file without retaining the old file id", () => {
    const draft = { ...state(), fileId: 91, sendAsAudio: true };
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

    const next = ChatReducer(draft, { type: "attach-file", file });
    expect(next).toMatchObject({
      file,
      sendAsAudio: false,
      sendAsDocument: false,
    });
    expect(next.fileId).toBeUndefined();
  });

  it("replaces a local attachment with an uploaded attachment without retaining the old file", () => {
    const draft = { ...state(), file: new File(["old"], "old.pdf"), sendAsDocument: true };

    const next = ChatReducer(draft, { type: "attach-file-id", fileId: 92 });
    expect(next).toMatchObject({
      fileId: 92,
      sendAsAudio: false,
      sendAsDocument: false,
    });
    expect(next.file).toBeUndefined();
  });

  it("replaces an uploaded attachment with a recording without retaining its file id", () => {
    const draft = { ...state(), fileId: 91, sendAsDocument: true };
    const file = new File(["audio"], "audio.mp3", { type: "audio/mpeg" });

    const next = ChatReducer(draft, { type: "set-audio", file });
    expect(next).toMatchObject({
      file,
      sendAsAudio: true,
      sendAsDocument: false,
    });
    expect(next.fileId).toBeUndefined();
  });

  it.each<ChangeMessageDataAction>([
    {
      type: "attach-file",
      file: new File(["document"], "document.pdf", { type: "application/pdf" }),
    },
    { type: "attach-file-id", fileId: 91 },
    { type: "set-audio", file: new File(["audio"], "audio.mp3", { type: "audio/mpeg" }) },
  ])("preserves the quoted draft when canceling after $type", (action) => {
    const quotedDraft = ChatReducer(state(), { type: "quote-message", id: 77 });
    const attached = ChatReducer(quotedDraft, action);
    const removed = ChatReducer({ ...attached, isEmojiMenuOpen: true }, { type: "remove-file" });

    expect(removed).toMatchObject({
      text: quotedDraft.text,
      quotedId: 77,
      mentions: quotedDraft.mentions,
      sendAsAudio: false,
      sendAsDocument: false,
      isEmojiMenuOpen: false,
    });
    expect(removed.file).toBeUndefined();
    expect(removed.fileId).toBeUndefined();
    expect(quotedDraft.quotedId).toBe(77);
  });

  it("clears text, attachment, quote and mentions on reset", () => {
    const original = { ...state(), file: new File(["contents"], "photo.jpg") };
    expect(ChatReducer(original, { type: "reset" })).toMatchObject({
      text: "",
      file: undefined,
      quotedId: undefined,
      mentions: [],
    });
    expect(original.text).toBe("Hello");
    expect(original.file.name).toBe("photo.jpg");
  });
  it("keeps the outgoing snapshot intact while the user types new text", () => {
    const outgoing = state();
    const next = ChatReducer(outgoing, { type: "change-text", text: "Next message" });
    expect(next).not.toBe(outgoing);
    expect(next.text).toBe("Next message");
    expect(outgoing.text).toBe("Hello");
    expect(next.quotedId).toBe(7);
  });
});
