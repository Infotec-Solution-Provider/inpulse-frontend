import { InternalMessage, User } from "@in.pulse-crm/sdk";
import { Logger } from "@in.pulse-crm/utils";

function getInternalMessageAuthor(
  messageFrom: string,
  phoneNameMap: Map<string, string>,
  users: User[],
  shouldDebug = false,
): string {
  let authorName = null;

  const startsWithUser = messageFrom.startsWith("user:");
  const startsWithExternal = messageFrom.startsWith("external:");
  const hasGUs = messageFrom.endsWith("@g.us");
  const isPhoneGroup = messageFrom.includes("-") && !messageFrom.includes(" ");

  if (startsWithUser) {
    const userId = +messageFrom.split(":")[1];
    const user = users.find((u) => u.CODIGO === userId);
    authorName = user ? user.NOME : null;
  }
  if (startsWithExternal && (hasGUs || isPhoneGroup)) {
    const parts = messageFrom.split(":");
    const raw = parts.length === 3 ? parts[2] : parts[1];
    const phone = raw.split("@")[0].replace(/\D/g, "");
    const contactName = phoneNameMap.get(phone) || phone.replace(/\D/g, "");

    authorName = contactName;
  } else if (startsWithExternal) {
    const splittedFrom = messageFrom.split(":");
    const phone = splittedFrom[1];
    const name = splittedFrom[2];

    const isNamePhone = checkIfNameIsPhone(name);
    const realPhone = isNamePhone ? name : phone;
    const sanitizedPhone = realPhone.replace(/\D/g, "");
    const contactName = !isNamePhone ? name : phoneNameMap.get(sanitizedPhone) || sanitizedPhone;

    authorName = contactName;
  }
  
  return authorName || "Sistema";
}

// Verifica se o nome contem apenas digitos
const checkIfNameIsPhone = (name: string) => {
  if (!name) return false;
  const hasOnlyDigits = /^\d+$/.test(name);
  const isValidLength = name.length >= 12 && name.length <= 15;

  return hasOnlyDigits && isValidLength;
};

export default getInternalMessageAuthor;
