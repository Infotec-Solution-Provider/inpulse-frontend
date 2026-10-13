import { describe, expect, it } from "vitest";
import shouldAutoScrollChat from "./chat-scroll-policy";

describe("chat scroll regression policy", () => {
  it("keeps automatic scrolling for every real-time message", () => {
    expect(shouldAutoScrollChat(false, false)).toBe(true);
  });

  it("does not introduce a near-bottom heuristic", () => {
    const positions = [0, 500, 10_000];
    expect(positions.every(() => shouldAutoScrollChat(false, false))).toBe(true);
  });

  it("does not jump to the end when an older page is prepended", () => {
    expect(shouldAutoScrollChat(true, false)).toBe(false);
  });
});
