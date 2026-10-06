import { describe, expect, it } from "vitest";
import type { SetStateAction } from "react";
import type { InternalMessage } from "@/lib/sdk-local";
import InternalMessageStatusHandler from "./internal-message-status";

function message(overrides: Partial<InternalMessage> = {}): InternalMessage {
  return {
    id: 76897,
    instance: "nunes",
    from: "user:7",
    type: "chat",
    quotedId: null,
    internalChatId: 132,
    body: "texto",
    timestamp: "1759760000000",
    isForwarded: false,
    isEdited: false,
    status: "PENDING",
    fileId: null,
    fileName: null,
    fileType: null,
    fileSize: null,
    ...overrides,
  };
}

function harness(initial: InternalMessage[], currentChatId: number | null = 132) {
  let messages: Record<number, InternalMessage[]> = { 132: initial };
  let current: InternalMessage[] = initial;
  const handler = InternalMessageStatusHandler(
    (update: SetStateAction<Record<number, InternalMessage[]>>) => {
      messages = typeof update === "function" ? update(messages) : update;
    },
    (update: SetStateAction<InternalMessage[]>) => {
      current = typeof update === "function" ? update(current) : update;
    },
    {
      current:
        currentChatId === null ? null : ({ chatType: "internal", id: currentChatId } as never),
    },
  );
  return { handler, get: () => ({ messages, current }) };
}

describe("internal_message_status handler", () => {
  it("merges the WhatsApp retry hint into both message stores on ERROR", () => {
    const { handler, get } = harness([message()]);
    handler({
      chatId: 132,
      internalMessageId: 76897,
      status: "ERROR",
      whatsappRetry: { allowed: true, requiresConfirmation: true },
    });
    const { messages, current } = get();
    expect(messages[132][0]).toMatchObject({
      status: "ERROR",
      whatsappRetry: { allowed: true, requiresConfirmation: true },
    });
    expect(current[0]).toMatchObject({
      status: "ERROR",
      whatsappRetry: { allowed: true, requiresConfirmation: true },
    });
  });

  it("clears the hint when a retry moves the message back to PENDING and then RECEIVED", () => {
    const { handler, get } = harness([
      message({ status: "ERROR", whatsappRetry: { allowed: true, requiresConfirmation: false } }),
    ]);
    handler({ chatId: 132, internalMessageId: 76897, status: "PENDING" });
    expect(get().current[0]).toMatchObject({ status: "PENDING", whatsappRetry: null });
    handler({ chatId: 132, internalMessageId: 76897, status: "RECEIVED" });
    expect(get().messages[132][0]).toMatchObject({ status: "RECEIVED", whatsappRetry: null });
  });

  it("leaves other chats' open conversation untouched", () => {
    const { handler, get } = harness([message()], 999);
    handler({ chatId: 132, internalMessageId: 76897, status: "ERROR" });
    expect(get().messages[132][0].status).toBe("ERROR");
    expect(get().current[0].status).toBe("PENDING");
  });
});
