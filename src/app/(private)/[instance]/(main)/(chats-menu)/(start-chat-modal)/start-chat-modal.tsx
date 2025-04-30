import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../app-context";
import { WppContactWithCustomer } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../../whatsapp-context";
import StartChatModalItem from "./start-chat-modal-item";

export default function StartChatModal() {
  const { closeModal } = useContext(AppContext);
  const { wppApi } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<Array<WppContactWithCustomer>>([]);

  useEffect(() => {
    if (wppApi.current) {
      wppApi.current.getContactsWithCustomer().then((data) => {
        setContacts(data);
      });
    }
  }, []);

  return (
    <div className="w-[35rem] rounded-md bg-slate-800 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Iniciar conversa</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <div></div>
      <ul className="flex h-[30rem] flex-col items-center gap-2 overflow-y-auto">
        {contacts.map(({ customer, chatingWith, ...contact }) => {
          return (
            <StartChatModalItem
              key={contact.id}
              contact={contact}
              customer={customer}
              chatingWith={chatingWith}
            />
          );
        })}
      </ul>
    </div>
  );
}
