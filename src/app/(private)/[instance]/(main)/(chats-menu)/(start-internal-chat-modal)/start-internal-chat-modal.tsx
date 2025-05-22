import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useMemo } from "react";
import { AppContext } from "../../../app-context";
import StartInternalChatModalItem from "./start-internal-chat-modal-item";
import { InternalChatContext } from "../../../internal-context";

export default function StartInternalChatModal() {
  const { closeModal } = useContext(AppContext);
  const { users, internalChats } = useContext(InternalChatContext);
  
  const startedChats: Array<number> = useMemo(() => {
    const directChats = internalChats.filter((c) => !c.isGroup);
    const usersSet: Set<number> = new Set();

    directChats.forEach((chat) => {
      chat.participants.forEach((p) => usersSet.add(p.userId));
    });

    return Array.from(usersSet);
  }, [internalChats]);

  return (
    <div className="w-[35rem] rounded-md bg-slate-800 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Iniciar conversa Interna</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <ul className="flex h-[30rem] flex-col items-center gap-2 overflow-y-auto">
        {users.map((u) => {
          return (
            <StartInternalChatModalItem
              key={u.CODIGO}
              user={u}
              isStarted={startedChats.some((su) => su === u.CODIGO)}
            />
          );
        })}
      </ul>
    </div>
  );
}
