import { InternalMessage, User, WppMessage } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { DetailedChat } from "../../../whatsapp-context";
import { QuotedMessageProps } from "../message";
import getInternalMessageAuthor from "../../../../../../lib/utils/get-internal-message-author";


function debug(
  quotedMsg: InternalMessage | WppMessage | null,
  message: string,
  data?: any
) {
  if (quotedMsg?.id === 43691) {
    console.log(`[getQuotedMsgProps] ${message}`, data);
  }
}

export default function getQuotedMsgProps(
  quotedMsg: InternalMessage | WppMessage | null,
  style: "received" | "sent" | "system" | "thirdparty",
  users: User[],
  chat?: DetailedChat | null,
  contactsMap?: Map<string, string>,
): QuotedMessageProps | null {

  if (!quotedMsg) {
    debug(quotedMsg, "quotedMsg é nulo, retornando null");
    return null;
  }

  let authorName: string | null = getInternalMessageAuthor(quotedMsg.from, contactsMap || new Map(), users);

  const result = {
    id: quotedMsg.id,
    style,
    text: quotedMsg.body,
    fileId: quotedMsg.fileId,
    fileName: quotedMsg.fileName,
    fileType: quotedMsg.fileType,
    author: authorName || quotedMsg.from,
  };

  return result;
}
