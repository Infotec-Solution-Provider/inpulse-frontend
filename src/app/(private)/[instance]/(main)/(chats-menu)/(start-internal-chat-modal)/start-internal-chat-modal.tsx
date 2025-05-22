import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext } from "react";
import { AppContext } from "../../../app-context";
import StartInternalChatModalItem from "./start-internal-chat-modal-item";
import { InternalChatContext } from "../../../internal-context";

export default function StartInternalChatModal() {
  const { closeModal } = useContext(AppContext);
  const { users, internalChats } = useContext(InternalChatContext);

  const directChats = internalChats.filter((chat) => chat.participants.length === 2);

  const filteredUsers = users.filter((user) => {
    return !directChats.some((chat) =>
      chat.participants.some((p) => p.userId === user.CODIGO)
    );
  });

  return (
    <div className="w-[35rem] rounded-md bg-slate-800 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Iniciar conversa Interna</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <ul className="flex h-[30rem] flex-col items-center gap-2 overflow-y-auto">
        {filteredUsers.map((user) => (
          <StartInternalChatModalItem key={user.CODIGO} user={user} />
        ))}
      </ul>
    </div>
  );
}
