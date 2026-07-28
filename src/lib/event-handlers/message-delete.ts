import { WppMessage, WppMessageDeleteEventData } from "@/lib/sdk-local";
import { Dispatch, SetStateAction } from "react";

function revokeMessage(message: WppMessage): WppMessage {
  return message.status === "REVOKED" ? message : {
    ...message,
    body: "Mensagem apagada",
    status: "REVOKED",
    fileId: null,
    fileName: null,
    fileType: null,
    fileSize: null,
  };
}

export default function MessageDeleteHandler(
  setMessages: Dispatch<SetStateAction<Record<number, WppMessage[]>>>,
  setCurrentChatMessages: Dispatch<SetStateAction<WppMessage[]>>,
) {
  return ({ messageId, contactId }: WppMessageDeleteEventData) => {
    setMessages((previous) => ({
      ...previous,
      [contactId]: (previous[contactId] || []).map(
        (message) => message.id === messageId ? revokeMessage(message) : message,
      ),
    }));
    setCurrentChatMessages((previous) => previous.map(
      (message) => message.id === messageId ? revokeMessage(message) : message,
    ));
  };
}