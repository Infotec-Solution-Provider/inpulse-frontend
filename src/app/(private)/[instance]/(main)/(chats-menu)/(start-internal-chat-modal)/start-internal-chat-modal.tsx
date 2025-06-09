import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useMemo } from "react";
import StartInternalChatModalItem from "./start-internal-chat-modal-item";
import { InternalChatContext } from "../../../internal-context";
import { useState } from "react";

export default function StartInternalChatModal({ onClose }: { onClose: () => void }) {
  const { users, internalChats } = useContext(InternalChatContext);
  const [searchTerm, setSearchTerm] = useState("");

  const startedChats: Array<number> = useMemo(() => {
    const directChats = internalChats.filter((c) => !c.isGroup);
    const usersSet: Set<number> = new Set();

    directChats.forEach((chat) => {
      chat.participants.forEach((p) => usersSet.add(p.userId));
    });

    return Array.from(usersSet);
  }, [internalChats]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.NOME.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
  <div className="w-[22rem] rounded-md bg-white text-gray-800 px-4 py-4 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-lg font-semibold ">Iniciar conversa Interna</h1>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar por nome..."
        className="mb-4 w-full rounded-md border bg-white border-gray-300 px-3 py-2 text-sm dark:bg-slate-700 dark:border-gray-600 dark:text-white"
      />
    <ul className="flex h-[25rem] text-sm flex-col items-center gap-2 overflow-y-auto scrollbar-whatsapp">
        {filteredUsers.map((u) => {
          return (
            <StartInternalChatModalItem
              key={u.CODIGO}
              user={u}
              isStarted={startedChats.some((su) => su === u.CODIGO)}
              onSelect={onClose}
            />
          );
        })}
      </ul>
    </div>
  );
}
