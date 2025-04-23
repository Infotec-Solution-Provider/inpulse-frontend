import Message from "./message";
import { useContext, useEffect, useRef } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { WppMessage } from "@in.pulse-crm/sdk";

export default function ChatMessagesList() {
  const { openedChatMessages } = useContext(WhatsappContext);
  const ulRef = useRef<HTMLUListElement>(null);

  function getMessageFrom(msg: WppMessage) {
    if (msg.from.startsWith("system:")) {
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
  }, [openedChatMessages]);

  return (
    <ul className="flex flex-col gap-2 overflow-y-auto bg-slate-300/10 p-2" ref={ulRef}>
      {openedChatMessages.map((message) => (
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
