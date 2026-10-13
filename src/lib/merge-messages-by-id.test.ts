import { describe, expect, it } from "vitest";
import mergeMessagesById from "./merge-messages-by-id";

describe("mergeMessagesById", () => {
  it("preserves live messages that arrived after an older page was requested", () => {
    const page = [
      { id: 1, body: "first" },
      { id: 2, body: "stale" },
    ];
    const live = [
      { id: 2, body: "updated" },
      { id: 3, body: "live" },
    ];

    expect(mergeMessagesById(page, live)).toEqual([
      { id: 1, body: "first" },
      { id: 2, body: "updated" },
      { id: 3, body: "live" },
    ]);
  });

  it("keeps the existing timeline when the loaded page is empty", () => {
    expect(mergeMessagesById([], [{ id: 9, body: "live" }])).toEqual([{ id: 9, body: "live" }]);
  });

  it("sorts an old cache and a newer first page chronologically", () => {
    const newestPage = [
      { id: 3, timestamp: "300", body: "third" },
      { id: 4, timestamp: "400", body: "fourth" },
    ];
    const oldCache = [
      { id: 1, timestamp: "100", body: "first" },
      { id: 2, timestamp: "200", body: "second" },
    ];

    expect(mergeMessagesById(newestPage, oldCache).map((message) => message.id)).toEqual([
      1, 2, 3, 4,
    ]);
  });
});
