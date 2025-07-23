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
  customerName: string | null;
  cpfCnpj: string | null;
  codErp: string | null;
  customerId: number | null;
  startDate: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  chatType?: string | null;
}

export default function ChatHeader({
  name,
  avatarUrl,
  customerName,
  phone,
  chatType,
  codErp,
  cpfCnpj,
  customerId,
  startDate,

}: ChatContactInfoProps) {
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
    <div className="flex items-center justify-between gap-4 border-b bg-slate-200 px-4 py-2 dark:border-none dark:bg-slate-800 md:pt-2 pt-10">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-300 dark:bg-slate-700 rounded-md px-2 py-1">
          <Avatar
            variant="rounded"
            alt={name}
            src={avatarUrl || ""}
            sx={{ width: 60, height: 60 }}
          />
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">
              {name}
            </h2>
            <h2 className="text-sm text-slate-700 dark:text-slate-200">{customerName || "Contato Não Atribuído"}</h2>
            <h2 className="text-sm text-slate-400 dark:text-slate-300">
              {phone ? Formatter.phone(phone) : ""}
            </h2>
          </div>
        </div>
        {customerId && (
          <div className="bg-slate-300 dark:bg-slate-700 rounded-md px-2 py-1 flex flex-col">
            <span className="text-slate-800 dark:text-slate-200 text-sm">
              <b>CPF/CNPJ: </b>
              {cpfCnpj || "N/D"}
            </span>
            <span className="text-sm text-slate-800 dark:text-slate-200">
              <b>Código Cliente: </b>
              {customerId || "N/D"}
            </span>
            <span className="text-sm text-slate-800 dark:text-slate-200">
              <b>Código ERP: </b>
              {codErp || "N/D"}
            </span>
          </div>)
        }
      </div>
      {currentChat?.chatType === "wpp" && (
        <div className="flex items-center">
          <Tooltip title={<h3 className="text-base dark:text-white">Editar contato</h3>}>
            <IconButton onClick={openEditContactModal}>
              <EditIcon color="info" />
            </IconButton>
          </Tooltip>
          <Tooltip title={<h3 className="text-base dark:text-white">Transferir conversa</h3>}>
            <IconButton onClick={openTransferChatModal}>
              <SyncAltIcon color="secondary" />
            </IconButton>
          </Tooltip>
          <Tooltip title={<h3 className="text-base dark:text-white">Agendar retorno</h3>}>
            <IconButton onClick={openScheduleChatModal}>
              <ScheduleIcon color="warning" />
            </IconButton>
          </Tooltip>
          <Tooltip title={<h3 className="text-base dark:text-white">Finalizar conversa</h3>}>
            <IconButton onClick={openFinishChatModal}>
              <AssignmentTurnedInIcon color="success" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
