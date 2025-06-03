import { WppMessage } from "@in.pulse-crm/sdk";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { useContext } from "react";
import { ChatContext } from "./chat-context";
import { DetailedChat, useWhatsappContext } from "../../whatsapp-context";

function getWppMessageStyle(msg: WppMessage) {
  if (msg.from.startsWith("system")) {
    return "system";
  }
  if (msg.from.startsWith("me:")) {
    return "sent";
  }

  return "received";
}

export default function RenderWhatsappChatMessages() {
  const { currentChatMessages, currentChat } = useWhatsappContext();
  const { getMessageById, handleQuoteMessage } = useContext(ChatContext);

  return (
    <>
      {currentChatMessages.map((m) => {
        const findQuoted =
          m.contactId && m.quotedId && (getMessageById(m.contactId, m.quotedId) as WppMessage);

        const quotedMsg = findQuoted
          ? getQuotedMsgProps(
              findQuoted,
              getWppMessageStyle(findQuoted),
              [],
              currentChat as DetailedChat,
            )
          : null;

        return (
          <Message
            id={m.id}
            key={`message_${m.id}`}
            style={getWppMessageStyle(m)}
            text={m.body}
            date={new Date(+m.timestamp)}
            status={m.status}
            fileId={m.fileId}
            fileName={m.fileName}
            fileType={m.fileType}
            fileSize={m.fileSize}
            quotedMessage={quotedMsg}
            onQuote={() => {
              handleQuoteMessage(m);
            }}
          />
        );
      })}
    </>
  );
}
