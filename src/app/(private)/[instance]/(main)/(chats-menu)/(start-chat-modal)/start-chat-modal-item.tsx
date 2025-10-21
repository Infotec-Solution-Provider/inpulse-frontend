import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { IconButton, Avatar, Tooltip, Chip } from "@mui/material";
import { useContext } from "react";
import { WhatsappContext } from "../../../whatsapp-context";
import { useAppContext } from "../../../app-context";
import SendTemplateModal from "@/lib/components/send-template-modal";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";

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
      className="group w-full transform rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:bg-slate-800/80"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar
          src={contact.avatarUrl}
          alt={contact.name}
          sx={{
            width: 56,
            height: 56,
            border: "3px solid",
            borderColor: customer ? "#10b981" : "#6b7280",
            transition: "all 0.3s",
            ".group:hover &": {
              transform: "scale(1.1)",
              borderColor: "#6366f1",
            },
          }}
        >
          <PersonIcon sx={{ fontSize: 32 }} />
        </Avatar>

        {/* Informações do Contato */}
        <div className="flex flex-1 gap-6">
          <div className="flex flex-1 flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <PersonIcon className="text-indigo-500" sx={{ fontSize: 18 }} />
              <span className="text-base font-bold text-gray-800 dark:text-white">
                {contact.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIcon className="text-gray-500" sx={{ fontSize: 16 }} />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {(() => {
                  try {
                    return Formatter.phone(contact.phone);
                  } catch (error) {
                    // Se o formatador falhar, retorna o número original
                    return contact.phone;
                  }
                })()}
              </span>
            </div>
          </div>

          {/* Informações do Cliente */}
          {customer ? (
            <div className="flex flex-1 flex-col justify-center gap-1 border-l-2 border-indigo-200 pl-4 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <BusinessIcon className="text-green-500" sx={{ fontSize: 18 }} />
                <span className="text-sm font-semibold text-gray-800 dark:text-white">
                  {customer.RAZAO}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeIcon className="text-gray-500" sx={{ fontSize: 16 }} />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {formatCpfCnpj(customer.CPF_CNPJ)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center border-l-2 border-gray-200 pl-4 dark:border-gray-700">
              <Chip
                label="Não Atribuído"
                size="small"
                sx={{
                  backgroundColor: "rgba(156, 163, 175, 0.2)",
                  color: "rgb(107, 114, 128)",
                  fontWeight: 500,
                }}
              />
            </div>
          )}
        </div>

        {/* Ação */}
        <div className="flex items-center">
          {chatingWith ? (
            <Tooltip title={`Em conversa com ${chatingWith}`} arrow>
              <Chip
                label={chatingWith}
                color="error"
                size="small"
                sx={{
                  fontWeight: 600,
                  animation: "pulse-slow 2s ease-in-out infinite",
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Iniciar conversa" arrow>
              <IconButton
                onClick={handleClickStart}
                sx={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  transition: "all 0.3s",
                  "&:hover": {
                    background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
                    transform: "scale(1.1) rotate(5deg)",
                  },
                }}
              >
                <ChatBubbleIcon />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>
    </li>
  );
}
