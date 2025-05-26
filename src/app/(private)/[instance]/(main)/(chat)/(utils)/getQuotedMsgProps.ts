import { InternalMessage, User, WppMessage } from "@in.pulse-crm/sdk";
import { QuotedMessageProps } from "../message";
import { DetailedChat } from "../../../whatsapp-context";
import { Formatter } from "@in.pulse-crm/utils";

export default function getQuotedMsgProps(
  quotedMsg: InternalMessage | WppMessage | null,
  style: "received" | "sent" | "system",
  users: User[],
  chat?: DetailedChat | null,
): QuotedMessageProps | null {
  if (!quotedMsg) return null;

  let authorName: string | null = null;

  if ("internalChatId" in quotedMsg && quotedMsg.from.startsWith("user:")) {
    const userId = +quotedMsg.from.split(":")[1];
    const user = users.find((u) => u.CODIGO === userId);

    authorName = user ? user.NOME : null;
  }

  if (chat && "contactId" in quotedMsg) {
    const phone = chat.contact?.phone;
    authorName = chat.contact?.name || (phone ? Formatter.phone(phone) : "N/D");
  }

  return {
    id: quotedMsg.id,
    style,
    text: quotedMsg.body,
    fileId: quotedMsg.fileId,
    fileName: quotedMsg.fileName,
    fileType: quotedMsg.fileType,
    author: authorName || quotedMsg.from,
  };
}
