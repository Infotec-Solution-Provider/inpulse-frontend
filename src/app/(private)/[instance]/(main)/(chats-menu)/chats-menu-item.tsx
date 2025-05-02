import { Avatar } from "@mui/material";
import ChatsMenuItemTag from "./chats-menu-item-tag";
import { ReactNode, useMemo } from "react";

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

  return (
    <li
      aria-busy={Boolean(isUnread)}
      aria-selected={Boolean(isOpen)}
      className="group relative grid cursor-pointer grid-cols-[74px_1fr] rounded-md p-3 hover:bg-indigo-500 hover:bg-opacity-20 aria-selected:bg-white/10"
      onClick={onClick}
    >
      <div className="flex items-center">
        <Avatar alt={name} src={avatar || ""} sx={{ width: 64, height: 64 }} />
      </div>
      <div className="flex flex-col gap-1 truncate">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm leading-none text-slate-100">{name}</p>
          <div className="flex items-center gap-2 text-slate-300 group-aria-busy:text-orange-200">
            <p className="text-xs">{lastMessageDateText}</p>
            <div
              className="h-3 w-3 rounded-full bg-red-600 aria-hidden:hidden"
              aria-hidden={!Boolean(isUnread)}
            ></div>
          </div>
        </div>
        <div className="truncate text-sm text-slate-300 font-emoji">{message}</div>
        <div className="flex items-center justify-end gap-1">
          {tags?.map((tag) => (
            <ChatsMenuItemTag key={tag.name} name={tag.name} color={tag.color} />
          ))}
        </div>
      </div>
    </li>
  );
}
