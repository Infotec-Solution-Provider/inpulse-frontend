import { AuthContext } from "@/app/auth-context";
import { Avatar } from "@mui/material";
import { ReactNode, useContext, useMemo } from "react";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { InternalChatContext } from "../../internal-context";
import ChatsMenuItemTag from "./chats-menu-item-tag";

interface Tag {
  name: string;
  color: string;
}

interface ChatsMenuItemProps {
  name: string;
  customer?: string;
  avatar?: string;
  message: ReactNode;
  messageDate: Date | null;
  tags: Tag[];
  isUnread?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
}

export default function ChatsMenuItem({
  name,
  avatar,
  message,
  messageDate,
  tags,
  customer,
  isUnread,
  isOpen,
  onClick,
}: ChatsMenuItemProps) {
  const { user } = useContext(AuthContext);
  const { users } = useContext(InternalChatContext);
  const { state } = useContext(ContactsContext);

  const lastMessageDateText = useMemo(() => {
    if (!messageDate) {
      return "Nunca";
    }

    const today = new Date();
    const isMessageFromToday = messageDate.toDateString() === today.toDateString();

    if (isMessageFromToday) {
      return messageDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return messageDate.toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [messageDate]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  function wasMentioned(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    // Extrai todos os "@<telefone>"
    const matches = text.match(/@(\d{6,})/g);
    if (!matches) return false;

    const mentionedPhones = matches.map((m) => m.replace("@", ""));

    const userPhones = new Set<string>();

    // Se o user logado tiver telefone
    if (user?.WHATSAPP) {
      userPhones.add(user.WHATSAPP.replace(/\D/g, ""));
    }

    // Busca nos users com o mesmo CODIGO do logado
    const matchUser = users.find((u) => u.CODIGO === user?.CODIGO);
    if (matchUser?.WHATSAPP) {
      userPhones.add(matchUser.WHATSAPP.replace(/\D/g, ""));
    }

    // Busca nos contacts (caso o número não esteja nos users)
    for (const contact of state.contacts) {
      if (contact.id === user?.CODIGO && contact.phone) {
        userPhones.add(contact.phone.replace(/\D/g, ""));
      }
    }

    // Verifica se algum telefone mencionado bate com o telefone do usuário
    return mentionedPhones.some((p) => userPhones.has(p));
  }

  return (
    <li
      aria-busy={Boolean(isUnread)}
      aria-selected={Boolean(isOpen)}
      className="chat-list-item group relative"
    >
      <div
        className="chat-item-clickable grid h-full w-full cursor-pointer touch-manipulation select-none grid-cols-[58px_minmax(0,1fr)] rounded-md px-3 py-2.5 transition-colors hover:bg-indigo-500/10 active:bg-indigo-500/20 aria-selected:bg-white/10 sm:grid-cols-[66px_minmax(0,1fr)] sm:p-3"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (typeof onClick === "function") {
              onClick();
            }
          }
        }}
        data-testid="chat-menu-item"
        data-clickable="true"
      >
        <div className="flex items-center">
          <Avatar
            alt={name}
            src={avatar || ""}
            sx={{ width: { xs: 48, sm: 56 }, height: { xs: 48, sm: 56 } }}
          />
        </div>
        <div className="flex flex-col gap-1 truncate">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate text-sm leading-none text-gray-900 dark:text-slate-100">
              {name}
            </p>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 group-aria-busy:dark:text-orange-200">
              <p className={`text-xs font-semibold ${isUnread ? "text-red-600" : ""}`}>
                {lastMessageDateText}
              </p>
              {isUnread && (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-red-600"></div>
                  {typeof message === "string" && wasMentioned(message) && (
                    <span className="text-xs font-bold leading-none text-indigo-600">@</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {customer && (
            <p className="font-semibold truncate text-xs leading-none text-gray-900 dark:text-slate-100">
              {customer}
            </p>
          )}
          <div className="font-emoji truncate text-xs text-gray-700 dark:text-slate-300">
            {message}
          </div>
          <div className="flex items-center justify-end gap-1">
            {tags?.map((tag) => (
              <ChatsMenuItemTag key={tag.name} name={tag.name} color={tag.color} />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
