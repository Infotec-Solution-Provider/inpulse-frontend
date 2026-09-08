import { describe, expect, it } from "vitest";
import ChatReducer, { SendMessageDataState } from "./chat-reducer";

const state = (): SendMessageDataState => ({
  text: "Hello", sendAsAudio: false, sendAsDocument: false, isEmojiMenuOpen: false,
  quotedId: 7, mentions: [{ userId: 2, name: "Ana", phone: "123" }],
});

describe("chat composer state", () => {
  it("clears text, attachment, quote and mentions on reset", () => {
    const original = { ...state(), file: new File(["contents"], "photo.jpg") };
    expect(ChatReducer(original, { type: "reset" })).toMatchObject({
      text: "", file: undefined, quotedId: undefined, mentions: [],
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
