import { WppMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import { Dispatch, SetStateAction } from "react";

export default function MessageReactionHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return ({ messageId, reaction }: WppMessageReactionEventData) => {
    setMessages((previous) => Object.fromEntries(
      Object.entries(previous).map(([contactId, messages]) => [
        contactId,
        messages.map((message) => message.id === messageId ? { ...message, reaction } : message),
      ]),
    ));
    setCurrentChatMessages((previous) => previous.map(
      (message) => message.id === messageId ? { ...message, reaction } : message,
    ));
  };
}