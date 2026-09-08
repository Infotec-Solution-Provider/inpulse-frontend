import { WppMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import {
  applyReactionToCache,
  applyReactionToMessages,
  ReactionUpdateSource,
} from "@/lib/utils/message-reactions";

export default function MessageReactionHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
  chatRef?: RefObject<{ chatType: string } | null>,
  source: ReactionUpdateSource = "socket",
) {
  return (event: WppMessageReactionEventData) => {
    if (event.messageType !== "wpp") return;
    setMessages((previous) => applyReactionToCache(previous, event, source));
    if (!chatRef || chatRef.current?.chatType === "wpp") {
      setCurrentChatMessages((previous) => applyReactionToMessages(previous, event, source));
    }
  };
}
