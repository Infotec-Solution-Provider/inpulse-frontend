import { describe, expect, it } from "vitest";
import ChatReducer, { SendMessageDataState } from "./chat-reducer";

const draft = (): SendMessageDataState => ({
  text: "Hello",
  sendAsAudio: false,
  sendAsDocument: false,
  isEmojiMenuOpen: false,
  quotedId: 7,
  mentions: [{ userId: 2, name: "Ana", phone: "123" }],
});
const attempt = () => ChatReducer(draft(), { type: "set-attempt", key: "attempt-1", clientId: 3 });

describe("composer acknowledgement", () => {
  it("preserves text, attachment, quote and retry key until an acknowledgement", () => {
    const file = new File(["attachment contents"], "photo.jpg", { type: "image/jpeg" });
    const sent = { ...attempt(), file };
    const reopened = ChatReducer(draft(), { type: "restore-draft", draft: sent });
    expect(reopened).toBe(sent);
    expect(reopened.file).toBe(file);
    const cleared = ChatReducer(reopened, { type: "acknowledge", sent });
    expect(cleared).toMatchObject({
      text: "",
      file: undefined,
      attemptKey: undefined,
      quotedId: undefined,
      mentions: [],
    });
  });

  it("does not erase new text typed while the previous snapshot is in flight", () => {
    const sent = attempt();
    const newer = ChatReducer(sent, { type: "change-text", text: "Next message" });
    expect(newer.attemptKey).toBeUndefined();
    expect(ChatReducer(newer, { type: "acknowledge", sent })).toBe(newer);
  });

  it("does not erase a replacement attachment or a new reply while awaiting an acknowledgement", () => {
    const sent = { ...attempt(), file: new File(["one"], "one.txt") };
    const newer = ChatReducer(sent, { type: "attach-file", file: new File(["two"], "two.txt") });
    expect(ChatReducer(newer, { type: "acknowledge", sent })).toBe(newer);
    const quoted = ChatReducer(sent, { type: "quote-message", id: 99 });
    expect(ChatReducer(quoted, { type: "acknowledge", sent })).toBe(quoted);
  });

  it("keeps the attempt key for unchanged text and presentation-only changes", () => {
    const sent = attempt();
    expect(ChatReducer(sent, { type: "change-text", text: sent.text }).attemptKey).toBe(
      "attempt-1",
    );
    expect(ChatReducer(sent, { type: "toggle-emoji-menu" }).attemptKey).toBe("attempt-1");
    expect(ChatReducer(sent, { type: "remove-quoted-message" }).attemptKey).toBeUndefined();
    expect(sent.quotedId).toBe(7);
  });
});
