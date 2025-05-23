import Message from "./message";
import { useContext, useEffect, useMemo, useRef } from "react";
import { WhatsappContext } from "../../whatsapp-context";
import { InternalMessage, User, WppMessage } from "@in.pulse-crm/sdk";
import { InternalChatContext } from "../../internal-context";
import { AuthContext } from "@/app/auth-context";
import GroupMessage from "./group-message";
import { Formatter } from "@in.pulse-crm/utils";

function getWppMessageStyle(msg: WppMessage) {
  if (msg.from.startsWith("system")) {
    return "system";
  }
  if (msg.from.startsWith("me:")) {
    return "sent";
  }

  return "received";
}

function getInternalMessageStyle(msg: InternalMessage, userId: number) {
  if (msg.from === "system") {
    return "system";
  }
  if (msg.from === `user:${userId}`) {
    return "sent";
  }

  return "received";
}

export default function ChatMessagesList() {
  const { currentChatMessages, currentChat } = useContext(WhatsappContext);
  const { currentInternalChatMessages, users } = useContext(InternalChatContext);
  const { user } = useContext(AuthContext);

  const ulRef = useRef<HTMLUListElement>(null);

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
      phone && map.set(phone, user);
    }
    return map;
  }, [users]);

  useEffect(() => {
    if (ulRef.current) {
      ulRef.current.scrollTop = ulRef.current.scrollHeight;
    }
  }, [currentChatMessages, currentInternalChatMessages]);

  useEffect(() => {
    const handleScrollToBottom = () => {
      if (ulRef.current) {
        ulRef.current.scrollTop = ulRef.current.scrollHeight;
      }
    };

    document.addEventListener("scroll-to-bottom", handleScrollToBottom);

    return () => {
      document.removeEventListener("scroll-to-bottom", handleScrollToBottom);
    };
  }, []);

  return (
    <ul
      className="flex h-full w-full flex-col gap-2 overflow-y-auto bg-slate-300/10 p-2"
      ref={ulRef}
    >
      {user && currentChat?.chatType === "wpp" &&
        currentChatMessages.map((m) => (
          <Message
            key={`message_${m.id}`}
            style={getWppMessageStyle(m)}
            text={m.body}
            date={new Date(+m.timestamp)}
            status={m.status}
            fileId={m.fileId}
            fileName={m.fileName}
            fileType={m.fileType}
            fileSize={m.fileSize}
          />
        ))}
      {user &&
        currentChat?.chatType === "internal" &&
        !currentChat.isGroup &&
        currentInternalChatMessages &&
        currentInternalChatMessages.length > 0 &&
        currentInternalChatMessages.map((m) => (
          <Message
            key={`message_${m.id}`}
            style={getInternalMessageStyle(m, user!.CODIGO)}
            text={m.body}
            date={new Date(+m.timestamp)}
            status={m.status}
            fileId={m.fileId}
            fileName={m.fileName}
            fileType={m.fileType}
            fileSize={m.fileSize}
          />
        ))}

      {user &&
        currentChat?.chatType === "internal" &&
        currentChat.isGroup &&
        usersMap.size > 0 &&
        currentInternalChatMessages &&
        currentInternalChatMessages.length > 0 &&
        currentInternalChatMessages.map((m, i, arr) => {
          let name: string | null = null;
          const prev = i > 0 ? arr[i - 1] : null;
          const groupFirst = !prev || prev.from !== m.from;

          if (m.from.startsWith("user:")) {
            const userId = Number(m.from.split(":")[1]);
            const findUser = usersMap.get(userId);
            name = findUser ? findUser.NOME : null;
          }
          if (m.from.startsWith("external:")) {
            // apenas digitos replace
            const phone = m.from.split(":")[2].replace(/\D/g, "");
            const findUser = usersPhoneMap.get(phone);
            name = findUser ? findUser.NOME : Formatter.phone(phone);
            console.log(phone, findUser, usersPhoneMap.values());
          }

          return (
            <GroupMessage
              key={`message_${m.id}`}
              style={getInternalMessageStyle(m, user.CODIGO)}
              groupFirst={groupFirst}
              sentBy={name || "Desconhecido"}
              text={m.body}
              date={new Date(+m.timestamp)}
              status={m.status}
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
            />
          );
        })}
    </ul>
  );
}
