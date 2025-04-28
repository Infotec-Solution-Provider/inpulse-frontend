import { InternalContact, User} from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import { useContext } from "react";
import { InternalChatContext } from "../../../internal-context";

interface StartChatModalItemProps {
  contact: InternalContact;
  user?: User | null;
  chatingWith?: string | null;
}

export default function StartInternalChatModalItem({
  contact,
  user = null,
  chatingWith = null,
}: StartChatModalItemProps) {
  const { startInternalChatByContactId } = useContext(InternalChatContext);

  const handleClickStart = () => {
    startInternalChatByContactId(contact.id);
  };

  return (
    <li
      key={contact.id}
      className="flex w-full items-center justify-between gap-2 rounded-md bg-slate-700 p-2"
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{contact.name}</span>
        {user && <span className="text-xs text-blue-200">{user.SETOR_NOME}</span>}
        
        <span className="text-xs text-slate-400">{contact.phone}</span>
      </div>
      <div>
        {chatingWith ? (
          <p className="text-sm text-red-400">{chatingWith}</p>
        ) : (
          <Button size="small" onClick={handleClickStart}>
            Iniciar
          </Button>
        )}
      </div>
    </li>
  );
}
