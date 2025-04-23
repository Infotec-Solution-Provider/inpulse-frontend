import { ChatUrgency } from "@/lib/types/chats.types";
import { Formatter } from "@in.pulse-crm/utils";
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

export interface ChatContactInfoProps {
  name: string;
  avatarUrl?: string | null;
}

export default function ChatHeader({ name, avatarUrl }: ChatContactInfoProps) {
  const { openModal } = useContext(AppContext);

  const openFinishChatModal = () => {
    openModal(<FinishChatModal chatId={1} />);
  };

  const openTransferChatModal = () => {
    openModal(<TransferChatModal chatId={1} />);
  };

  const openScheduleChatModal = () => {
    openModal(<ScheduleChatModal chatId={1} />);
  };

  const openEditContactModal = () => {
    openModal(<EditContactModal contactId={1} />);
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <div className="flex items-center gap-4">
        <Avatar
          variant="circular"
          alt={name}
          src={avatarUrl || ""}
          sx={{ width: 32, height: 32 }}
        />
        <h2>{name}</h2>
      </div>

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
    </div>
  );
}
