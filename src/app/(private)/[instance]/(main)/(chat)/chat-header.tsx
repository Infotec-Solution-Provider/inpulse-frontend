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
  company: string;
  phone: string;
  cnpj: string;
  id: number;
  erpId: string;
  startDate: Date;
  urgency: ChatUrgency;
}

export default function ChatHeader({
  name,
  company,
  phone,
  cnpj,
  id,
  erpId,
  startDate,
  urgency,
  avatarUrl,
}: ChatContactInfoProps) {
  const { openModal } = useContext(AppContext);

  const openFinishChatModal = () => {
    openModal(<FinishChatModal chatId={1} />);
  };

  const openTransferChatModal = () => {
    openModal(<TransferChatModal chatId={1} />)
  }

  const openScheduleChatModal = () => {
    openModal(<ScheduleChatModal chatId={1} />)
  }

  const openEditContactModal = () => {
    openModal(<EditContactModal contactId={1} />)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 p-2">
          <Avatar
            variant="rounded"
            alt={name}
            src={avatarUrl || ""}
            sx={{ width: 64, height: 64 }}
          />
          <div>
            <p>{name}</p>
            <p>{company}</p>
            <p>{Formatter.phone(phone)}</p>
          </div>
        </div>
        <div>
          <p>
            <b>CNPJ/CPF: </b>
            {cnpj}
          </p>
          <p>
            <b>Código: </b>
            {id}
          </p>
          <p>
            <b>Código ERP: </b>
            {erpId}
          </p>
        </div>
      </div>

      <div className="mr-8 flex items-center">
        <Tooltip title={<h3 className="text-base">Editar contato</h3>}>
          <IconButton size="large" onClick={openEditContactModal}>
            <EditIcon fontSize="large" color="info" />
          </IconButton>
        </Tooltip>
        <Tooltip title={<h3 className="text-base">Transferir conversa</h3>}>
          <IconButton size="large" onClick={openTransferChatModal}>
            <SyncAltIcon fontSize="large" color="secondary" />
          </IconButton>
        </Tooltip>
        <Tooltip title={<h3 className="text-base">Agendar retorno</h3>}>
          <IconButton size="large" onClick={openScheduleChatModal}>
            <ScheduleIcon fontSize="large" color="warning" />
          </IconButton>
        </Tooltip>
        <Tooltip title={<h3 className="text-base">Finalizar conversa</h3>}>
          <IconButton size="large" onClick={openFinishChatModal}>
            <AssignmentTurnedInIcon fontSize="large" color="success" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
