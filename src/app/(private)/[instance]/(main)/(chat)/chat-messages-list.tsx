import { useContext, useEffect, useRef } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { InternalChatContext } from "../../internal-context";
import { AuthContext } from "@/app/auth-context";
import RenderWhatsappChatMessages from "./render-whatsapp-chat-messages";
import RenderInternalChatMessages from "./render-internal-chat-messages";
import RenderInternalGroupMessages from "./render-internal-group-messages";

export default function ChatMessagesList() {
  const { currentChatMessages, currentChat } = useContext(WhatsappContext);
  const { currentInternalChatMessages } = useContext(InternalChatContext);
  const { user } = useContext(AuthContext);
  const isWhatsappChat = currentChat?.chatType === "wpp";
  const isInternalChat = currentChat?.chatType === "internal" && !currentChat.isGroup;
  const isInternalGroup = currentChat?.chatType === "internal" && currentChat.isGroup;

  const ulRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (ulRef.current) {
      ulRef.current.scrollTop = ulRef.current.scrollHeight;
    }
  }, [currentChatMessages, currentInternalChatMessages]);

  useEffect(() => {
    const handleScrollToBottom = () => {
      if (ulRef.current) {
        ulRef.current.scrollTop = ulRef.current.scrollHeight;
      }
    };

    document.addEventListener("scroll-to-bottom", handleScrollToBottom);

    return () => {
      document.removeEventListener("scroll-to-bottom", handleScrollToBottom);
    };
  }, []);

  return (
    <>
      {user && (
        <ul
          className="flex h-full w-full flex-col gap-2 scrollbar-whatsapp bg-slate-300 dark:bg-slate-700 p-2"
          ref={ulRef}
        >
          {isWhatsappChat && <RenderWhatsappChatMessages />}
          {isInternalChat && <RenderInternalChatMessages />}
          {isInternalGroup && <RenderInternalGroupMessages />}
        </ul>
      )}
    </>
  );
}
