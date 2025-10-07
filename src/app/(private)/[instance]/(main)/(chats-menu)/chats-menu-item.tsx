import { AuthContext } from "@/app/auth-context";
import { Avatar } from "@mui/material";
import { ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { InternalChatContext } from "../../internal-context";
import ChatsMenuItemTag from "./chats-menu-item-tag";

interface Tag {
  name: string;
  color: string;
}

interface ChatsMenuItemProps {
  name: string;
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
  isUnread,
  isOpen,
  onClick,
}: ChatsMenuItemProps) {
  const { user } = useContext(AuthContext);
  const { users } = useContext(InternalChatContext);
  const { contacts } = useContext(ContactsContext);
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

  // Referência para o elemento do chat
  const chatItemRef = useRef<HTMLDivElement>(null);

  // Função para lidar com cliques de mouse
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Feedback visual
    const target = e.currentTarget as HTMLElement;
    target.style.backgroundColor = "rgba(99, 102, 241, 0.2)";
    setTimeout(() => {
      target.style.backgroundColor = "";
    }, 150);

    if (typeof onClick === "function") {
      try {
        onClick();
      } catch (error) {
        console.error("Error executing onClick handler:", error);
      }
    } else {
      console.warn("No valid onClick handler provided:", onClick);
    }
  };

  // Função para lidar com eventos de toque
  const handleTouchStart = (e: React.TouchEvent) => {
    // Adiciona feedback visual imediato
    const target = e.currentTarget as HTMLElement;
    target.style.backgroundColor = "rgba(99, 102, 241, 0.2)";
    target.style.transform = "scale(0.98)";
  };

  // Função para lidar com o fim do toque
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Remove o feedback visual
    const target = e.currentTarget as HTMLElement;
    target.style.backgroundColor = "";
    target.style.transform = "";

    if (typeof onClick === "function") {
      try {
        onClick();
      } catch (error) {
        console.error("Error executing onClick handler:", error);
      }
    } else {
      console.warn("No valid onClick handler provided:", onClick);
    }
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
    for (const contact of contacts) {
      if (contact.id === user?.CODIGO && contact.phone) {
        userPhones.add(contact.phone.replace(/\D/g, ""));
      }
    }

    // Verifica se algum telefone mencionado bate com o telefone do usuário
    return mentionedPhones.some((p) => userPhones.has(p));
  }

  // Função para lidar com o movimento do toque (evita scroll)
  const handleTouchMove = (e: React.TouchEvent) => {
    // Previne scroll durante o toque no item
    e.preventDefault();
    e.stopPropagation();
  };

  // Adiciona listeners de eventos diretamente ao DOM para maior compatibilidade
  useEffect(() => {
    const element = chatItemRef.current;
    if (!element) return;

    // Função para forçar o clique
    const forceClick = () => {
      if (typeof onClick === "function") {
        try {
          onClick();
        } catch (error) {
          console.error("Error executing onClick handler:", error);
        }
      }
    };

    // Adiciona listeners nativos
    element.addEventListener("click", forceClick);
    element.addEventListener("touchend", forceClick);

    // Cleanup
    return () => {
      element.removeEventListener("click", forceClick);
      element.removeEventListener("touchend", forceClick);
    };
  }, [onClick]);

  return (
    <li
      aria-busy={Boolean(isUnread)}
      aria-selected={Boolean(isOpen)}
      className="chat-list-item group relative"
    >
      <div
        ref={chatItemRef}
        className="chat-item-clickable grid h-full w-full cursor-pointer touch-manipulation select-none grid-cols-[74px_1fr] rounded-md p-3 hover:bg-indigo-500 hover:bg-opacity-20 active:bg-indigo-500 active:bg-opacity-30 aria-selected:bg-white/10"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        style={{
          WebkitTapHighlightColor: "transparent",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "manipulation",
          transition: "all 0.15s ease",
          position: "relative",
          zIndex: 10,
          pointerEvents: "auto",
        }}
        data-testid="chat-menu-item"
        data-clickable="true"
      >
        <div className="flex items-center">
          <Avatar alt={name} src={avatar || ""} sx={{ width: 64, height: 64 }} />
        </div>
        <div className="flex flex-col gap-1 truncate">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm leading-none text-gray-900 dark:text-slate-100">
              {name}
            </p>
            <div className="flex items-center gap-2 text-gray-700 group-aria-busy:text-orange-200 dark:text-slate-300">
              <p className="text-xs">{lastMessageDateText}</p>
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
          <div className="font-emoji truncate text-sm text-gray-700 dark:text-slate-300">
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
