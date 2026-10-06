import { describe, expect, it } from "vitest";
import type { InternalChat, InternalChatMember, InternalMessage } from "@/lib/sdk-local";
import processInternalChatsAndMessages from "./process-internal-chats-and-messages";
import { canRetryInternalMessage } from "./utils/internal-message-retry";

const ADMIN_ID = 1;
const AUTHOR_ID = 7;
const READ_AT = new Date("2026-10-06T12:00:00.000Z");

function chat(): InternalChat & { participants: InternalChatMember[] } {
  return {
    id: 132,
    wppGroupId: "1203630@g.us",
    participants: [
      { userId: ADMIN_ID, lastReadAt: READ_AT },
      { userId: AUTHOR_ID, lastReadAt: null },
    ],
  } as unknown as InternalChat & { participants: InternalChatMember[] };
}

function message(id: number, status: InternalMessage["status"], minutesBeforeRead: number) {
  return {
    id,
    instance: "nunes",
    from: `user:${AUTHOR_ID}`,
    type: "chat",
    quotedId: null,
    internalChatId: 132,
    body: "texto",
    timestamp: String(READ_AT.getTime() - minutesBeforeRead * 60_000),
    isForwarded: false,
    isEdited: false,
    status,
    fileId: null,
    fileName: null,
    fileType: null,
    fileSize: null,
  } as InternalMessage;
}

describe("processInternalChatsAndMessages read marker", () => {
  it("keeps ERROR on another user's already-read message so an ADMIN can retry after reload", () => {
    const { detailedChats, chatsMessages } = processInternalChatsAndMessages(
      ADMIN_ID,
      [],
      [chat()],
      [message(1, "ERROR", 10), message(2, "RECEIVED", 5)],
    );

    const [failed, delivered] = chatsMessages[132];
    expect(failed.status).toBe("ERROR");
    expect(delivered.status).toBe("READ");
    // Lida pelo lastReadAt: não deixa o chat como não lido.
    expect(detailedChats[0].isUnread).toBe(false);
    expect(
      canRetryInternalMessage({
        message: failed,
        chat: detailedChats[0],
        userId: ADMIN_ID,
        isAdmin: true,
        readOnly: false,
        selectionMode: false,
      }),
    ).toBe(true);
  });

  it("still flags the chat as unread for an ERROR message newer than lastReadAt", () => {
    const { detailedChats } = processInternalChatsAndMessages(
      ADMIN_ID,
      [],
      [chat()],
      [message(3, "ERROR", -5)],
    );
    expect(detailedChats[0].isUnread).toBe(true);
  });
});
