import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Button } from "@mui/material";
import { useContext } from "react";
import { WhatsappContext } from "../../../whatsapp-context";
import { useAppContext } from "../../../app-context";

interface StartChatModalItemProps {
  contact: WppContact;
  customer?: Customer | null;
  chatingWith?: string | null;
}

export default function StartChatModalItem({
  contact,
  customer = null,
  chatingWith = null,
}: StartChatModalItemProps) {
  const { closeModal } = useAppContext();
  const { startChatByContactId } = useContext(WhatsappContext);

  const handleClickStart = () => {
    startChatByContactId(contact.id);
    closeModal();
  };

  return (
    <li
      key={contact.id}
      className="flex w-full items-center justify-between gap-2 rounded-md bg-slate-700 p-2"
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{contact.name}</span>
        {customer && <span className="text-xs text-blue-200">{customer.RAZAO}</span>}
        <span className="text-xs text-slate-400">{Formatter.phone(contact.phone)}</span>
      </div>
      <div>
        {chatingWith ? (
          <p className="text-sm text-red-400">{chatingWith}</p>
        ) : (
          <Button size="small" onClick={handleClickStart}>
            Adicionar
          </Button>
        )}
      </div>
    </li>
  );
}
