import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EditIcon from "@mui/icons-material/Edit";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import { useContext } from "react";
import { AppContext } from "../../app-context";
import EditContactModal from "./(actions)/edit-contact-modal";
import FinishChatModal from "./(actions)/finish-chat-modal";
import ScheduleChatModal from "./(actions)/schedule-chat-modal";
import TransferChatModal from "./(actions)/transfer-chat-modal";
import { Formatter } from "@in.pulse-crm/utils";
import { useWhatsappContext } from "../../whatsapp-context";
import DeleteChatModal from "./(actions)/delete-internal-chat-modal";

export interface ChatContactInfoProps {
  name: string;
  customerName: string;
  phone: string;
  avatarUrl?: string | null;
  chatType?: string | null;
}

export default function ChatHeader({ name, avatarUrl, customerName, phone, chatType }: ChatContactInfoProps) {
  const { openModal } = useContext(AppContext);
  const { currentChat } = useWhatsappContext();

  const openFinishChatModal = () => {
    openModal(<FinishChatModal />);
  };
  const openDeleteChatModal = () => {
    openModal(<DeleteChatModal />);
  };
  const openTransferChatModal = () => {
    openModal(<TransferChatModal />);
  };

  const openScheduleChatModal = () => {
    openModal(<ScheduleChatModal />);
  };

  const openEditContactModal = () => {
    openModal(<EditContactModal />);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <div className="flex items-center gap-4">
        <Avatar
          variant="circular"
          alt={name}
          src={avatarUrl || ""}
          sx={{ width: 60, height: 60 }}
        />
        <div>
          <h2 className="text-slate-200">{name}</h2>
          <h2 className="text-sm text-slate-300">{customerName}</h2>
          <h2 className="text-sm text-slate-400">
            {chatType == "wpp" ? Formatter.phone(phone) : ""}
          </h2>
        </div>
      </div>
            {currentChat?.chatType === "internal" && !currentChat.isGroup && (
        <div className="flex items-center">
          <Tooltip title={<h3 className="text-base">Deletar conversa</h3>}>
            <IconButton onClick={openDeleteChatModal}>
              <AssignmentTurnedInIcon color="success" />
            </IconButton>
          </Tooltip>
        </div>
      )}
      {currentChat?.chatType === "wpp" && (
        <div className="flex items-center">
          <Tooltip title={<h3 className="text-base">Editar contato</h3>}>
            <IconButton onClick={openEditContactModal}>
              <EditIcon color="info" />
            </IconButton>
          </Tooltip>
          <Tooltip title={<h3 className="text-base">Transferir conversa</h3>}>
            <IconButton onClick={openTransferChatModal}>
              <SyncAltIcon color="secondary" />
            </IconButton>
          </Tooltip>
          <Tooltip title={<h3 className="text-base">Agendar retorno</h3>}>
            <IconButton onClick={openScheduleChatModal}>
              <ScheduleIcon color="warning" />
            </IconButton>
          </Tooltip>
          <Tooltip title={<h3 className="text-base">Finalizar conversa</h3>}>
            <IconButton onClick={openFinishChatModal}>
              <AssignmentTurnedInIcon color="success" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
