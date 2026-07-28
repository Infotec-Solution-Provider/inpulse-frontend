import { InternalMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import { Dispatch, SetStateAction } from "react";

export default function InternalMessageReactionHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
) {
  return ({ messageId, reaction }: WppMessageReactionEventData) => {
    setMessages((previous) => Object.fromEntries(
      Object.entries(previous).map(([chatId, messages]) => [
        chatId,
        messages.map((message) => message.id === messageId ? { ...message, reaction } : message),
      ]),
    ));
    setCurrentChatMessages((previous) => previous.map(
      (message) => message.id === messageId ? { ...message, reaction } : message,
    ));
  };
}