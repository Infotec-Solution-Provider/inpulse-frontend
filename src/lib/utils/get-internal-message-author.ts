import { InternalMessage, User } from "@in.pulse-crm/sdk";

function getInternalMessageAuthor(
  message: InternalMessage,
  phoneNameMap: Map<string, string>,
  users: User[],
): string {
  let authorName = null;

  const startsWithUser = message?.from?.startsWith("user:");
  const startsWithExternal = message?.from?.startsWith("external:");
  const hasSpecialChar = ["@", "-"].some((char) => message.from.includes(char));

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
    const sanitizedPhone = phone ? phone.replace(/\D/g, "") : "";
    const contactName = phoneNameMap.get(sanitizedPhone) || sanitizedPhone;

    authorName = contactName;
  }

  return authorName || "Sistema";
}


export default getInternalMessageAuthor;