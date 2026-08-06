import { InternalMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import { Dispatch, SetStateAction } from "react";

export default function InternalMessageReactionHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
) {
  return ({ messageId, reaction }: WppMessageReactionEventData) => {
    setMessages((previous) => {
      for (const [chatId, messages] of Object.entries(previous)) {
        const index = messages.findIndex((message) => message.id === messageId);
        if (index === -1) continue;
        const next = [...messages];
        next[index] = { ...next[index]!, reaction };
        return { ...previous, [chatId]: next };
      }
      return previous;
    });
    setCurrentChatMessages((previous) =>
      previous.map((message) => (message.id === messageId ? { ...message, reaction } : message)),
    );
  };
}
