import { InternalMessage, User, WppMessage } from "@/lib/sdk-local";
import { DetailedChat } from "../../../whatsapp-context";
import { QuotedMessageProps } from "../message";
import getInternalMessageAuthor from "../../../../../../lib/utils/get-internal-message-author";
import { replaceMentions } from "@/lib/utils/message-mentions";
import { WppContact } from "@/lib/sdk-local";

export default function getQuotedMsgProps(
  quotedMsg: InternalMessage | WppMessage | null,
  style: "received" | "sent" | "system" | "thirdparty",
  users: User[],
  contacts: WppContact[] = [],
  chat?: DetailedChat | null,
  contactsMap?: Map<string, string>,
  whatsappSenderNameMap?: Map<string, string>,
): QuotedMessageProps | null {
  if (!quotedMsg) {
    return null;
  }

  const authorName = getInternalMessageAuthor(
    quotedMsg.from,
    contactsMap || new Map(),
    users,
    whatsappSenderNameMap,
  );

  const result = {
    id: quotedMsg.id,
    style,
    text: replaceMentions(quotedMsg.body || "", users, contacts),
    fileId: quotedMsg.fileId,
    fileName: quotedMsg.fileName,
    fileType: quotedMsg.fileType,
    author: authorName || quotedMsg.from,
  };

  return result;
}
