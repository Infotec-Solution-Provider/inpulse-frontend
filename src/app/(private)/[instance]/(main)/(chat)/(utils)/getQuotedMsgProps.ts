import { InternalMessage, User, WppMessage } from "@in.pulse-crm/sdk";
import { QuotedMessageProps } from "../message";
import { DetailedChat } from "../../../whatsapp-context";
import { Formatter } from "@in.pulse-crm/utils";

export default function getQuotedMsgProps(
  quotedMsg: InternalMessage | WppMessage | null,
  style: "received" | "sent" | "system" | "thirdparty",
  users: User[],
  chat?: DetailedChat | null,
  contactsMap?: Map<string, string>,
): QuotedMessageProps | null {
  if (!quotedMsg) return null;

  let authorName: string | null = null;

  const startsWithUser = quotedMsg?.from?.startsWith("user:");
  const startsWithExternal = quotedMsg?.from?.startsWith("external:");
  const hasSpecialChar = ["@", "-"].some((char) => quotedMsg.from.includes(char));

  if (startsWithUser) {
    const userId = +quotedMsg.from.split(":")[1];
    const user = users.find((u) => u.CODIGO === userId);
    authorName = user ? user.NOME : null;
  }
  if (startsWithExternal && !hasSpecialChar) {
    const parts = quotedMsg.from.split(":");
    let raw = parts.length === 3 ? parts[2] : parts[1];
    const phone = raw.split("@")[0].replace(/\D/g, "");
    const user = users.find((u) => u.WHATSAPP === phone);
    const usersPhone = contactsMap?.get(phone);

    authorName = user ? user.NOME : usersPhone ? usersPhone : phone;
  }
  if (startsWithExternal && hasSpecialChar) {
    const [type, phone, name] = quotedMsg.from.split(":");

    authorName = name ? name : phone ? phone.replace(/\D/g, "") : "N/D";
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
