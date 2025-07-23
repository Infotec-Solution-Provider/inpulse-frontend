import { useEffect, useMemo, useState } from "react";
import { Formatter } from "@in.pulse-crm/utils";
import { User, WppContact } from "@in.pulse-crm/sdk";

export interface MentionableUser {
  userId: number;
  name: string;
  phone: string;
}

export type ChatAction =
  | { type: "change-text"; text: string }
  | { type: "set-mentions"; mentions: MentionableUser[] };

interface UseMentionsParams {
  stateText: string;
  mentions: MentionableUser[];
  participants: any[];
  users: User[];
  contacts: WppContact[];
  dispatch: React.Dispatch<ChatAction>;
}

export function useMentions({
  stateText,
  mentions,
  participants,
  users,
  contacts,
  dispatch,
}: UseMentionsParams) {
  const [textWithNames, setTextWithNames] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCandidates, setMentionCandidates] = useState<MentionableUser[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);

  const usersMap = useMemo(() => {
    const map = new Map<number, User>();
    for (const user of users) map.set(user.CODIGO, user);
    return map;
  }, [users]);

  const usersPhoneMap = useMemo(() => {
    const map = new Map<string, User>();
    for (const user of users) {
      const phone = user.WHATSAPP?.replace(/\D/g, "");
      if (phone) map.set(phone, user);
    }
    return map;
  }, [users]);

  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contacts) {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone) map.set(phone, contact.name);
    }
    return map;
  }, [contacts]);

  useEffect(() => {
    let text = stateText || "";
    mentions.forEach((m) => {
      text = text.split(`@${m.phone}`).join(`@${m.name}`);
    });
    setTextWithNames(text);
  }, [stateText, mentions]);

  const handleTextChange = (valueWithNames: string) => {
    setTextWithNames(valueWithNames);

    let convertedText = valueWithNames;
    mentions.forEach((m) => {
      const escapedName = m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`@${escapedName}`, "g");
      convertedText = convertedText.replace(regex, `@${m.phone}`);
    });

    dispatch({ type: "change-text", text: convertedText });

    const match = valueWithNames.match(/@(\w*)$/);
    if (match && participants.length > 0) {
      const query = match[1];
      setMentionQuery(query);

      const filtered = participants
        .map((p: any): MentionableUser | null => {
          const rawId = String(p.userId);
          const isPhone = rawId.length > 8;
          if (isPhone) {
            const phone = rawId.replace(/\D/g, "");
            const user = usersPhoneMap.get(phone);
            if (user) {
              return { userId: Number(rawId), name: user.NOME, phone };
            }
            const contactName = contactsMap.get(phone);
            return {
              userId: Number(rawId),
              name: contactName || Formatter.phone(phone),
              phone,
            };
          } else {
            const userId = Number(rawId);
            const user = usersMap.get(userId);
            if (user) {
              return { userId, name: user.NOME, phone: user.WHATSAPP || "" };
            }
            return null;
          }
        })
        .filter((u): u is MentionableUser => !!u);

      setMentionCandidates(filtered);
      setShowMentionList(true);
    } else {
      setMentionCandidates([]);
      setShowMentionList(false);
      setMentionQuery("");
    }
  };

  const selectMention = (
    mentionedUser: MentionableUser,
    text: string,
    cursorIndex: number
  ): { newTextWithNames: string; cursorPosition: number } => {
    const lastAtIndex = text.lastIndexOf(`@${mentionQuery}`, cursorIndex);
    const before = text.substring(0, lastAtIndex);
    const after = text.substring(cursorIndex);
    const newTextWithNames = `${before}@${mentionedUser.name} ${after}`;
    setTextWithNames(newTextWithNames);

    let convertedText = newTextWithNames;
    const newMentions = [...mentions.filter((m) => m.userId !== mentionedUser.userId), mentionedUser];
    newMentions.forEach((m) => {
      const escapedName = m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`@${escapedName}`, "g");
      convertedText = convertedText.replace(regex, `@${m.phone}`);
    });

    dispatch({ type: "change-text", text: convertedText });
    dispatch({ type: "set-mentions", mentions: newMentions });

    setMentionQuery("");
    setShowMentionList(false);

    return {
      newTextWithNames,
      cursorPosition: before.length + mentionedUser.name.length + 2,
    };
  };

  return {
    textWithNames,
    setTextWithNames,
    mentionCandidates,
    showMentionList,
    handleTextChange,
    selectMention,
  };
}
