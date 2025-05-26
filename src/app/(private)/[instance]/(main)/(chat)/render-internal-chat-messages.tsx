import { InternalMessage } from "@in.pulse-crm/sdk";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { useContext } from "react";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";

export function getInternalMessageStyle(msg: InternalMessage, userId: number) {
  if (msg.from === "system") {
    return "system";
  }

  if (msg.from === `user:${userId}`) {
    return "sent";
  }

  return "received";
}

export default function RenderInternalChatMessages() {
  const { currentInternalChatMessages, users } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage } = useContext(ChatContext);
  const { user } = useAuthContext();

  return (
    <>
      {currentInternalChatMessages.map((m) => {
        const findQuoted =
          m.internalChatId &&
          m.quotedId &&
          (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);

        const quotedMsg = findQuoted
          ? getQuotedMsgProps(findQuoted, getInternalMessageStyle(findQuoted, user!.CODIGO), users)
          : null;

        return (
          <Message
            id={m.id}
            key={`message_${m.id}`}
            style={getInternalMessageStyle(m, user!.CODIGO)}
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
