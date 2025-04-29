import Message from "./message";
import { useContext, useEffect, useRef } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { InternalMessage, WppMessage } from "@in.pulse-crm/sdk";
import { InternalChatContext } from "../../internal-context";
import { AuthContext } from "@/app/auth-context";

function getWppMessageStyle(msg: WppMessage) {
  if (msg.from.startsWith("system")) {
    return "system";
  }
  if (msg.from.startsWith("me:")) {
    return "sent";
  }

  return "received";
}

function getInternalMessageStyle(msg: InternalMessage, userId: number) {
  if (msg.from === "system") {
    return "system";
  }
  if (msg.from === `user:${userId}`) {
    return "sent";
  }

  return "received";
}

export default function ChatMessagesList() {
  const { currentChatMessages, currentChat } = useContext(WhatsappContext);
  const { currentInternalChatMessages } = useContext(InternalChatContext);
  const { user } = useContext(AuthContext);

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
    <ul
      className="flex h-full w-full flex-col gap-2 overflow-y-auto bg-slate-300/10 p-2"
      ref={ulRef}
    >
      {currentChat?.chatType === "wpp" &&
        currentChatMessages.map((m) => (
          <Message
            key={`message_${m.id}`}
            style={getWppMessageStyle(m)}
            text={m.body}
            date={new Date(+m.timestamp)}
            status={m.status}
            fileId={m.fileId}
            fileName={m.fileName}
            fileType={m.fileType}
            fileSize={m.fileSize}
          />
        ))}
      {currentChat?.chatType === "internal" &&
        currentInternalChatMessages.map((m) => (
          <Message
            key={`message_${m.id}`}
            style={getInternalMessageStyle(m, user!.CODIGO)}
            text={m.body}
            date={new Date(+m.timestamp)}
            status={m.status}
            fileId={m.fileId}
            fileName={m.fileName}
            fileType={m.fileType}
            fileSize={m.fileSize}
          />
        ))}
    </ul>
  );
}
