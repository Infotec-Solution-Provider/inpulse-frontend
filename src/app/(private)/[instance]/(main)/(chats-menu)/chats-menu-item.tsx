import { Avatar } from "@mui/material";
import ChatsMenuItemTag from "./chats-menu-item-tag";

interface Tag {
  name: string;
  color: string;
}

interface ChatsMenuItemProps {
  name: string;
  avatar?: string;
  message: string;
  date: string;
  tags: Tag[];
}

export default function ChatsMenuItem({
  name,
  avatar,
  message,
  date,
  tags,
}: ChatsMenuItemProps) {
  return (
    <li className="cursor-pointer grid-rows-2 rounded-md border border-slate-700 p-2 hover:bg-indigo-500 hover:bg-opacity-20">
      <div className="grid grid-cols-[74px_1fr]">
        <div className="flex items-center">
          <Avatar alt={name} src={avatar || ""} sx={{ width: 64, height: 64 }} />
        </div>
        <div className="flex flex-col gap-1 truncate">
          <p className="truncate text-sm leading-none text-slate-300">{name}</p>
          <p className="truncate text-sm text-slate-400">{message}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center justify-center gap-1">
              {tags.map((tag) => (
                <ChatsMenuItemTag key={tag.name} name={tag.name} color={tag.color} />
              ))}
            </div>
            <p className="text-xs text-slate-400">{date}</p>
          </div>
        </div>
      </div>
    </li>
  );
}
