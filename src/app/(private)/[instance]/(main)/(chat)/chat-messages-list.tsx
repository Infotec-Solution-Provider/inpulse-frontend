import Message from "./message";
import { useContext, useEffect, useRef } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { WppMessage } from "@in.pulse-crm/sdk";
import { InternalChatContext } from "../../internal-context";

export default function ChatMessagesList() {
  const { currentChatMessages: openedChatMessages } = useContext(WhatsappContext);
  const { currentInternalChatMessages: openedInternalChatMessages } = useContext(InternalChatContext);

  const ulRef = useRef<HTMLUListElement>(null);

  function getMessageFrom(msg: WppMessage) {
    if (msg.from.startsWith("system")) {
      return "system";
    }
    if (msg.from.startsWith("me:")) {
      return "sent";
    }

    return "received";
  }

  useEffect(() => {
    if (ulRef.current) {
      ulRef.current.scrollTop = ulRef.current.scrollHeight;
    }
  }, [openedChatMessages,openedInternalChatMessages]);

  return (
    <ul className="flex flex-col gap-2 overflow-y-auto bg-slate-300/10 p-2 w-full h-full" ref={ulRef}>
      {(openedInternalChatMessages.length > 0 ? openedInternalChatMessages : openedChatMessages).map((message) => (
        <Message
          key={`message_${message.id}`}
          style={getMessageFrom(message)}
          text={message.body}
          date={new Date(+message.timestamp)}
          status={message.status}
          fileId={message.fileId}
          fileName={message.fileName}
          fileType={message.fileType}
          fileSize={message.fileSize}
        />
      ))}
    </ul>
  );
}
