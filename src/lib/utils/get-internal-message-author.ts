import { InternalMessage, User } from "@/lib/sdk-local";

function getInternalMessageAuthor(
  messageFrom: string,
  phoneNameMap: Map<string, string>,
  users: User[],
  whatsappSenderNameMap: Map<string, string> = new Map(),
): string {
  if (messageFrom.startsWith("user:")) {
    const userId = +messageFrom.split(":")[1];
    const user = users.find((u) => u.CODIGO === userId);
    return user?.NOME || "Sistema";
  }

  if (!messageFrom.startsWith("external:")) {
    return "Sistema";
  }

  const externalIdentity = messageFrom.slice("external:".length);
  const separatorIndex = externalIdentity.indexOf(":");
  const senderId =
    separatorIndex >= 0 ? externalIdentity.slice(0, separatorIndex) : externalIdentity;
  const embeddedName = separatorIndex >= 0 ? externalIdentity.slice(separatorIndex + 1).trim() : "";
  const assignedName = whatsappSenderNameMap.get(senderId);

  if (assignedName) return assignedName;
  if (embeddedName && !isIdentifierOnly(embeddedName, senderId)) return embeddedName;

  const embeddedPhone = embeddedName.replace(/\D/g, "");
  const senderPhone = senderId.split("@")[0]?.replace(/\D/g, "") || "";
  const knownContactName =
    (embeddedPhone && phoneNameMap.get(embeddedPhone)) ||
    (senderPhone && phoneNameMap.get(senderPhone));

  return knownContactName || embeddedPhone || senderPhone || senderId || "Sistema";
}

function isIdentifierOnly(name: string, senderId: string) {
  return (
    name === senderId ||
    /^[+() .-]*\d[\d+() .-]*$/.test(name) ||
    /@(?:c\.us|g\.us|lid|s\.whatsapp\.net)$/i.test(name)
  );
}

export default getInternalMessageAuthor;
