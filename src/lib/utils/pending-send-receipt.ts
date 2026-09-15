import type { WppMessage } from "@/lib/sdk-local";
import type { PendingChatSend } from "./pending-chat-sends";

/** A receipt changes presentation only; recovering a failed draft is a separate user action. */
export function pendingSendReceiptPatch(
  attempt: PendingChatSend,
  message: WppMessage,
): Partial<PendingChatSend> | null {
  if (message.status === "PENDING") {
    // A delayed read cannot replace an observed terminal outcome.
    if (attempt.messageId && (attempt.status === "unconfirmed" || attempt.status === "failed"))
      return {};
    return {
      status: "sending",
      messageId: message.id,
      contactId: message.contactId ?? attempt.contactId,
      error: undefined,
    };
  }
  if (message.status === "ERROR" || message.status === "UNKNOWN") {
    return {
      status: message.status === "ERROR" ? "failed" : "unconfirmed",
      messageId: message.id,
      contactId: message.contactId ?? attempt.contactId,
      error:
        message.sendError ||
        (message.status === "ERROR"
          ? "O envio foi recusado. Recupere a mensagem para tentar novamente."
          : "Ainda não foi possível confirmar o envio. A mensagem pode ter sido enviada."),
    };
  }
  return null;
}
