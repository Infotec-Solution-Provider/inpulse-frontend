import { describe, expect, it } from "vitest";
import type { InternalMessage, WppMessage } from "@/lib/sdk-local";
import { mergeMonitorHistoryMessages, monitorMessageDate } from "./history-state";

const message = (id: number, timestamp: string, sentAt?: string) =>
  ({
    id,
    timestamp,
    body: `message ${id}`,
    ...(sentAt ? { sentAt: new Date(sentAt) } : {}),
  }) as WppMessage;

describe("monitor history chronology", () => {
  it("uses the message instant instead of insertion IDs or synchronization dates", () => {
    const messages = [
      message(1, "1794495720000", "2026-11-12T10:00:00.000Z"),
      message(9, "1794495600", "2026-11-12T12:00:00.000Z"),
      message(4, "1794495660000"),
    ];
    expect(mergeMonitorHistoryMessages([], messages).map((item) => item.id)).toEqual([9, 4, 1]);
    expect(monitorMessageDate(messages[1]).getTime()).toBe(1794495600000);
  });

  it("merges overlapping pages once, applies current payloads and breaks time ties by ID", () => {
    const previous = [message(9, "1794495600"), message(1, "1794495720000")];
    const updated = { ...message(9, "1794495600000"), body: "edited" };
    const merged = mergeMonitorHistoryMessages(previous, [
      updated,
      message(12, "1794495540000"),
      message(8, "1794495600000"),
    ]);
    expect(merged.map((item) => item.id)).toEqual([12, 8, 9, 1]);
    expect(merged[2].body).toBe("edited");
    expect(previous.map((item) => item.id)).toEqual([9, 1]);
  });

  it("uses the same chronological ordering for internal history and falls back for missing timestamps", () => {
    const internal = { ...message(3, "1794495600"), internalChatId: 1 } as InternalMessage;
    const fallback = message(1, "invalid", "2026-11-12T07:00:00.000Z");
    expect(monitorMessageDate(fallback).toISOString()).toBe("2026-11-12T07:00:00.000Z");
    expect(
      mergeMonitorHistoryMessages([internal], [message(2, "1794495540000")]).map((item) => item.id),
    ).toEqual([2, 3]);
  });

  it("matches the API units boundary and rejects nonnumeric timestamp formats", () => {
    expect(monitorMessageDate(message(1, "100000000000")).getTime()).toBe(100000000000);
    expect(monitorMessageDate(message(1, "99999999999")).getTime()).toBe(99999999999000);
    expect(monitorMessageDate(message(1, "1e9", "2026-11-12T07:00:00.000Z")).toISOString()).toBe(
      "2026-11-12T07:00:00.000Z",
    );
  });
});
