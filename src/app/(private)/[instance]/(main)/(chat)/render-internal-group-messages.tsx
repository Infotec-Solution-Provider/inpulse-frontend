import { InternalMessage, User } from "@in.pulse-crm/sdk";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import { useContext, useMemo } from "react";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";
import GroupMessage from "./group-message";
import { Formatter } from "@in.pulse-crm/utils";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";

export function getInternalMessageStyle(msg: InternalMessage, userId: number) {
  if (msg.from === "system") {
    return "system";
  }

  if (msg.from === `user:${userId}`) {
    return "sent";
  }

  return "received";
}

export default function RenderInternalGroupMessages() {
  const { currentInternalChatMessages, users } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage } = useContext(ChatContext);
  const { user } = useAuthContext();
  const { contacts } = useContext(ContactsContext);

  const usersMap = useMemo(() => {
    const map = new Map<number, User>();
    for (const user of users) {
      map.set(user.CODIGO, user);
    }
    return map;
  }, [users]);

  const usersPhoneMap = useMemo(() => {
    const map = new Map<string, User>();
    for (const user of users) {
      const phone = user.WHATSAPP;
      if (phone) {
        map.set(phone, user);
      }
    }
    return map;
  }, [users]);

  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contacts) {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone) {
        map.set(phone, contact.name);
      }
    }
    return map;
  }, [contacts]);
  const mentionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of users) {
      const phone = user.WHATSAPP?.replace(/\D/g, "");
      if (phone) {
        map.set(phone, user.NOME);
      }
    }
    for (const contact of contacts) {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone && !map.has(phone)) {
        map.set(phone, contact.name);
      }
    }
    return map;
  }, [users, contacts]);

  return (
    <>
      {currentInternalChatMessages.map((m, i, arr) => {
        const findQuoted =
          m.internalChatId &&
          m.quotedId &&
          (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);

        const quotedMsg = findQuoted
          ? getQuotedMsgProps(
              findQuoted,
              getInternalMessageStyle(findQuoted, user!.CODIGO),
              users,
              null,
              contactsMap
            )
          : null;

        const prev = i > 0 ? arr[i - 1] : null;
        const groupFirst = !prev || prev.from !== m.from;
        let name: string | null = null;

        if (m.from.startsWith("user:")) {
          const userId = Number(m.from.split(":")[1]);
          const findUser = usersMap.get(userId);
          name = findUser ? findUser.NOME : null;
        }

        if (m.from.startsWith("external:")) {
          const parts = m.from.split(":");
          let raw = "";
          if (parts.length === 3) {
            raw = parts[2];
          } else if (parts.length === 2) {
            raw = parts[1];
          }
          const phone = raw.split("@")[0].replace(/\D/g, "");
          const findUser = usersPhoneMap.get(phone);
            if (findUser) {
              name = findUser.NOME;
            } else {
              const contactName = contactsMap.get(phone);
              if (contactName) {
                name = contactName;
              } else {
                name = phone
                  ? phone.length <= 13
                    ? Formatter.phone(phone)
                    : phone
                  : "Sem número";
              }
            }
        }

        return (
          <GroupMessage
            id={m.id}
            key={`message_${m.id}`}
            style={getInternalMessageStyle(m, user!.CODIGO)}
            groupFirst={groupFirst}
            sentBy={name || "Desconhecido"}
            text={m.body}
            date={new Date(+m.timestamp)}
            status={m.status}
            fileId={m.fileId}
            fileName={m.fileName}
            fileType={m.fileType}
            fileSize={m.fileSize}
            quotedMessage={quotedMsg}
            onQuote={() => {
              handleQuoteMessage(m);
            }}
            mentionNameMap={mentionNameMap}
          />
        );
      })}
    </>
  );
}
