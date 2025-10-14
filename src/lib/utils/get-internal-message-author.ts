import { InternalMessage, User } from "@in.pulse-crm/sdk";
import { Logger } from "@in.pulse-crm/utils";

function getInternalMessageAuthor(
  message: InternalMessage,
  phoneNameMap: Map<string, string>,
  users: User[],
): string {
  let authorName = null;

  const startsWithUser = message?.from?.startsWith("user:");
  const startsWithExternal = message?.from?.startsWith("external:");
  const hasSpecialChar = ["@", "-"].some((char) => message.from.includes(char));

  Logger.debug("Getting author for message", { message, startsWithUser, startsWithExternal });
  Logger.debug("Phone name map", phoneNameMap);

  if (startsWithUser) {
    const userId = +message.from.split(":")[1];
    const user = users.find((u) => u.CODIGO === userId);
    authorName = user ? user.NOME : null;
  }
  if (startsWithExternal && hasSpecialChar) {
    const parts = message.from.split(":");
    let raw = parts.length === 3 ? parts[2] : parts[1];
    const phone = raw.split("@")[0].replace(/\D/g, "");
    const contactName = phoneNameMap.get(phone) || phone.replace(/\D/g, "");

    authorName = contactName;
  }
  if (startsWithExternal && !hasSpecialChar) {
    const [_type, phone, name] = message.from.split(":");
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
