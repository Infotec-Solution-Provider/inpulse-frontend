import { WppMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import { Dispatch, SetStateAction } from "react";

export default function MessageReactionHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return ({ messageId, reaction }: WppMessageReactionEventData) => {
    setMessages((previous) => {
      for (const [contactId, messages] of Object.entries(previous)) {
        const index = messages.findIndex((message) => message.id === messageId);
        if (index === -1) continue;
        const next = [...messages];
        next[index] = { ...next[index]!, reaction };
        return { ...previous, [contactId]: next };
      }
      return previous;
    });
    setCurrentChatMessages((previous) =>
      previous.map((message) => (message.id === messageId ? { ...message, reaction } : message)),
    );
  };
}
