import { User } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import { useContext, useState } from "react";
import { InternalChatContext } from "../../../internal-context";
import { WhatsappContext } from "../../../whatsapp-context";
import { AppContext } from "../../../app-context";

interface StartChatModalItemProps {
  user: User;
  isStarted?: boolean;
}

export default function StartInternalChatModalItem({
  user,
  isStarted = false,
}: StartChatModalItemProps) {
  const { sectors } = useContext(WhatsappContext);
  const { startDirectChat } = useContext(InternalChatContext);
  const { closeModal } = useContext(AppContext);
  const [loading, setLoading] = useState(false);

  const handleClickStart = () => {
    if (loading) return;
    setLoading(true);
    startDirectChat(user.CODIGO);
    closeModal();
  };

  const sector = sectors.find((s) => s.id === user.SETOR);

  return (
<li className="flex w-full items-center justify-between gap-2 rounded-md bg-gray-300 text-gray-700 p-2 dark:bg-slate-700 dark:text-gray-100">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{user.NOME}</span>
    {sector && <span className="text-xs text-blue-700 dark:text-blue-300">{sector.name}</span>}
      </div>
      <div>
        <Button size="small" onClick={handleClickStart} disabled={isStarted}>
          {isStarted ? "Conversa já iniciada" : "Iniciar conversa"}
        </Button>
      </div>
    </li>
  );
}
