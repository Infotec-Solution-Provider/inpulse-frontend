import { User } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import { useContext } from "react";
import { InternalChatContext } from "../../../internal-context";
import { WhatsappContext } from "../../../whatsapp-context";

interface StartChatModalItemProps {
  user: User;
}

export default function StartInternalChatModalItem({ user }: StartChatModalItemProps) {
  const { sectors } = useContext(WhatsappContext);
  const { startDirectChat } = useContext(InternalChatContext);

  const handleClickStart = () => {
    startDirectChat(user.CODIGO);
  };

  const sector = sectors.find((s) => s.id === user.SETOR);

  return (
    <li className="flex w-full items-center justify-between gap-2 rounded-md bg-slate-700 p-2">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{user.NOME}</span>
        {sector && <span className="text-xs text-blue-200">{sector.name}</span>}
      </div>
      <div>
        <Button size="small" onClick={handleClickStart}>
          Iniciar
        </Button>
      </div>
    </li>
  );
}
