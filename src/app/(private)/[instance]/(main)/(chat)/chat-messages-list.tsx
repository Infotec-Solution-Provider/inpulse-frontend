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
  const messagesEndRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentChat?.id]);

  return (
    <>
      {user && (
        <ul
          className="flex flex-col w-full gap-2 scrollbar-whatsapp bg-slate-300 dark:bg-slate-700 p-2"
          ref={ulRef}
          style={{
            minHeight: 'calc(100vh - 114px)', // 60px header + 54px footer
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {isWhatsappChat && <RenderWhatsappChatMessages />}
          {isInternalChat && <RenderInternalChatMessages />}
          {isInternalGroup && <RenderInternalGroupMessages />}
          
          {/* Elemento invisível no final para rolagem */}
          <li ref={messagesEndRef} className="h-0" />
        </ul>
      )}
    </>
  );
}
