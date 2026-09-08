import { InternalMessage, WppMessageReactionEventData } from "@/lib/sdk-local";
import { Dispatch, RefObject, SetStateAction } from "react";
import {
  applyReactionToCache,
  applyReactionToMessages,
  ReactionUpdateSource,
} from "@/lib/utils/message-reactions";

export default function InternalMessageReactionHandler(
  setMessages: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<InternalMessage[]>>,
  chatRef?: RefObject<{ chatType: string } | null>,
  setMonitorMessages?: Dispatch<SetStateAction<Record<number, InternalMessage[]>>>,
  source: ReactionUpdateSource = "socket",
) {
  return (event: WppMessageReactionEventData) => {
    if (event.messageType !== "internal") return;
    setMessages((previous) => applyReactionToCache(previous, event, source));
    setMonitorMessages?.((previous) => applyReactionToCache(previous, event, source));
    if (!chatRef || chatRef.current?.chatType === "internal") {
      setCurrentChatMessages((previous) => applyReactionToMessages(previous, event, source));
    }
  };
}
