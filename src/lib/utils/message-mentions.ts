import { User, WppContact } from "@in.pulse-crm/sdk";

export function replaceMentions(
  text: string,
  users: User[] = [],
  contacts: WppContact[] = []
): string {
  const mentionPattern = /@(~?(?:\+?\d[\d\s().-]*\d))/g;
  const mentions = [...text.matchAll(mentionPattern)].map((match) => match[0]);
  if (!mentions) return text;

  const nonMentionContent = text.replace(mentionPattern, "").replace(/[\s,.;:!?()-]/g, "");
  const isOnlyMentions = nonMentionContent.length === 0;

  const usersPhoneMap = new Map<string, string>();
  const usersCodeMap = new Map<string, string>();
  const safeUsers = Array.isArray(users) ? users : [];
  const safeContacts = Array.isArray(contacts) ? contacts : [];

  for (const user of safeUsers) {
    if (user.CODIGO != null && user.NOME) {
      usersCodeMap.set(String(user.CODIGO), user.NOME);
    }

    const phone = user.WHATSAPP?.replace(/\D/g, "");
    if (phone && user.NOME) {
      usersPhoneMap.set(phone, user.NOME);
    }
  }

  const contactsPhoneMap = new Map<string, string>();
  for (const contact of safeContacts) {
    const phone = contact.phone?.replace(/\D/g, "");
    const whatsappId = (contact as unknown as { whatsappId?: string | null }).whatsappId
      ?.replace(/^me:/, "")
      .split("@")[0]
      ?.replace(/\D/g, "");

    if (contact.name) {
      if (phone) {
        contactsPhoneMap.set(phone, contact.name);
      }
      if (whatsappId) {
        contactsPhoneMap.set(whatsappId, contact.name);
      }
    }
  }

  function getName(idOrPhone: string): string {
    const raw = idOrPhone.replace(/^~/, "");
    const phone = raw.replace(/\D/g, "");

    const byCode = usersCodeMap.get(raw);
    if (byCode) {
      return byCode;
    }

    // Prioriza operador quando o número da menção bate com o WhatsApp cadastrado.
    const byOperatorPhone = usersPhoneMap.get(phone);
    if (byOperatorPhone) {
      return byOperatorPhone;
    }

    // Fallback para cliente/contato (equivalente ao clients.phone -> clients.name).
    const byClientPhone = contactsPhoneMap.get(phone);
    if (byClientPhone) {
      return byClientPhone;
    }

    return `@${idOrPhone}`;
  }

  if (isOnlyMentions && mentions) {
    const names = mentions.map((m) => getName(m.slice(1)));
    return names.map((name) => `Mencionou ${name}`).join(", ");
  }

  return text.replace(mentionPattern, (_, idOrPhone) => {
    const name = getName(idOrPhone);
    return name.startsWith("@") ? name : `@${name}`;
  });
}
