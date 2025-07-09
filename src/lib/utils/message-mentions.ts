import { User, WppContact } from "@in.pulse-crm/sdk";

export function replaceMentions(
  text: string,
  users: User[],
  contacts: WppContact[]
): string {
  const mentions = text.match(/@(\w+)/g);
  if (!mentions) return text;

  const isOnlyMentions = text.trim().split(/\s+/).every(word => /@\w+/.test(word));

  function getName(idOrPhone: string): string {
    const code = Number(idOrPhone);
    if (!isNaN(code)) {
      const user = users.find(u => u.CODIGO === code);
      if (user) return user.NOME || "Unknown";
    }
    const contact = contacts.find(c => c.phone === idOrPhone);

    if (contact) return contact.name || "Unknown";

    return `@${idOrPhone}`;
  }

  if (isOnlyMentions) {
    const names = mentions.map(m => getName(m.slice(1)));
    return names.map(name => `Mencionou ${name}`).join(", ");
  }

  return text.replace(/@(\w+)/g, (_, idOrPhone) => getName(idOrPhone));
}
