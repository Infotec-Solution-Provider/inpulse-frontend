import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Button } from "@mui/material";
import { useContext } from "react";
import { WhatsappContext } from "../../../whatsapp-context";
import { useAppContext } from "../../../app-context";
import { useAuthContext } from "@/app/auth-context";
import SendTemplateModal from "@/lib/components/send-template-modal";

interface StartChatModalItemProps {
  contact: WppContact;
  customer?: Customer | null;
  chatingWith?: string | null;
  onSelect: () => void;
}

export default function StartChatModalItem({
  contact,
  customer = null,
  chatingWith = null,
  onSelect,
}: StartChatModalItemProps) {
  const { startChatByContactId } = useContext(WhatsappContext);
  const { instance } = useAuthContext();
  const { openModal, closeModal } = useAppContext();

  const handleClickStart = () => {
    if (instance === "exatron" || instance === "infotec") {
      openModal(
        <SendTemplateModal
          onClose={closeModal}
          onSendTemplate={(data) => {
            startChatByContactId(contact.id, data);
            closeModal();
          }}
        />,
      );
      onSelect();
    } else {
      startChatByContactId(contact.id);
      onSelect();
    }
  };

  return (
    <li
      key={contact.id}
      className="flex w-full items-center justify-between gap-2 rounded-md bg-gray-300 p-2 text-gray-700 dark:bg-slate-700 dark:text-gray-100"
    >
      <div className="flex flex-col">
        <span className="text-xs font-semibold">{contact.name}</span>
        {customer && (
          <span className="text-xs text-blue-700 dark:text-blue-200">{customer.RAZAO}</span>
        )}
        <span className="text-xs text-slate-400">
          {contact.phone ? Formatter.phone(contact.phone) : "Telefone não encontrado"}
        </span>
      </div>
      <div>
        {chatingWith ? (
          <p className="text-xs text-red-400">{chatingWith}</p>
        ) : (
          <Button
            size="small"
            onClick={handleClickStart}
            sx={{
              fontSize: "0.65rem",
              padding: "2px 6px",
              minWidth: "80px",
              lineHeight: 1,
            }}
          >
            Iniciar
          </Button>
        )}
      </div>
    </li>
  );
}
