import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { IconButton } from "@mui/material";
import { useContext } from "react";
import { WhatsappContext } from "../../../whatsapp-context";
import { useAppContext } from "../../../app-context";
import SendTemplateModal from "@/lib/components/send-template-modal";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";

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
  const { startChatByContactId, parameters } = useContext(WhatsappContext);
  const { openModal, closeModal } = useAppContext();

  const handleClickStart = () => {
    if (parameters["is_official"] === "true") {
      setTimeout(() => {
        openModal(
          <SendTemplateModal
            onClose={closeModal}
            onSendTemplate={(data) => {
              startChatByContactId(contact.id, data);
              closeModal();
            }}
          />,
        );
      }, 1000); // delay de 1000 ms (1 segundo)
    } else {
      startChatByContactId(contact.id);
      onSelect();
    }
  };

  return (
    <li
      key={contact.id}
      className="flex w-full items-center justify-between gap-2 rounded-md bg-indigo-700/10 p-2"
    >
      <div className="flex items-center gap-4">
        <div className="flex w-48 flex-col">
          <span className="w-full truncate text-sm font-semibold">{contact.name}</span>
          <span className="w-full truncate text-sm">{Formatter.phone(contact.phone)}</span>
        </div>
        {customer ? (
          <div className="flex w-48 flex-col border-l border-slate-800 pl-2 dark:border-slate-200">
            <span className="w-full truncate text-sm font-semibold">{customer.RAZAO}</span>
            <span className="w-full truncate text-sm">{formatCpfCnpj(customer.CPF_CNPJ)}</span>
          </div>
        ) : (
          <div className="flex w-48 items-center border-l border-slate-800 pl-2">
            <span className="text-sm opacity-50">Não Atribuído</span>
          </div>
        )}
      </div>
      <div>
        {chatingWith ? (
          <p className="px-2 text-sm font-semibold text-red-400">{chatingWith}</p>
        ) : (
          <IconButton onClick={handleClickStart} color="info">
            <ChatBubbleIcon />
          </IconButton>
        )}
      </div>
    </li>
  );
}
