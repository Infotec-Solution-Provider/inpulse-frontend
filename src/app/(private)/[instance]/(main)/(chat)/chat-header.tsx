import AIPrototypeModal, { AIPrototypeMode } from "@/lib/components/ai-prototype-modal";
import { AI_PRESENTATION_MODE } from "@/lib/ai-prototype/config";
import { Formatter } from "@in.pulse-crm/utils";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import InsightsIcon from "@mui/icons-material/Insights";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SummarizeIcon from "@mui/icons-material/Summarize";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import { useContext, useMemo } from "react";
import { AppContext } from "../../app-context";
import { useWhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";
import EditContactModal from "./(actions)/edit-contact-modal";
import FinishChatModal from "./(actions)/finish-chat-modal";
import FinishInternalChatModal from "./(actions)/finish-internal-chat-modal";
import ScheduleChatModal from "./(actions)/schedule-chat-modal";
import TransferChatModal from "./(actions)/transfer-chat-modal";

const safeFormatPhone = (phone: string | null): string => {
  try {
    if (!phone) return "";
    return Formatter.phone(phone);
  } catch {
    return phone || "";
  }
};

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
  onClose?: () => void;
}

export default function ChatHeader({
  name,
  avatarUrl,
  customerName,
  phone,
  codErp,
  cpfCnpj,
  customerId,
  onClose,
}: ChatContactInfoProps) {
  const { openModal } = useContext(AppContext);
  const { currentChat, currentChatMessages } = useWhatsappContext();
  const { applySuggestedText, isReadOnlyMode } = useContext(ChatContext);
  const canInteract = !isReadOnlyMode && currentChat?.isFinished === false;
  const canOpenAIActions = AI_PRESENTATION_MODE && currentChat?.chatType === "wpp";

  const lastMessageBody = useMemo(() => {
    const lastMessage = [...currentChatMessages].reverse().find((message) => message.body?.trim());
    return lastMessage?.body || null;
  }, [currentChatMessages]);

  const openFinishChatModal = () => {
    openModal(<FinishChatModal />);
  };

  const openFinishInternalChatModal = () => {
    openModal(<FinishInternalChatModal />);
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

  const openAIPrototypeModal = (mode: AIPrototypeMode) => {
    openModal(
      <AIPrototypeModal
        mode={mode}
        onApplySuggestion={mode === "suggest-response" ? applySuggestedText : undefined}
        context={{
          contactName: name,
          customerName,
          customerId,
          phone,
          startedAt: currentChat?.startedAt ? String(currentChat.startedAt) : null,
          messageCount: currentChatMessages.length,
          lastMessage: lastMessageBody,
        }}
      />
    );
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b bg-slate-200 px-4 py-2 pt-10 dark:border-none dark:bg-slate-800 md:pt-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md bg-slate-300 px-2 py-1 dark:bg-slate-700">
          <Avatar
            variant="rounded"
            alt={name}
            src={avatarUrl || ""}
            sx={{ width: 60, height: 60 }}
          />
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">{name}</h2>
            <h2 className="text-sm text-slate-700 dark:text-slate-200">
              {customerName || "Contato Não Atribuído"}
            </h2>
            <h2 className="text-sm text-slate-400 dark:text-slate-300">{safeFormatPhone(phone)}</h2>
          </div>
        </div>
        {customerId && (
          <div className="flex flex-col rounded-md bg-slate-300 px-2 py-1 dark:bg-slate-700">
            <span className="text-sm text-slate-800 dark:text-slate-200">
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
          </div>
        )}
      </div>
      <div className="flex items-center">
        {canOpenAIActions && (
          <>
            <Tooltip title={<h3 className="text-base dark:text-white">Sugerir resposta</h3>}>
              <IconButton onClick={() => openAIPrototypeModal("suggest-response")}>
                <AutoAwesomeIcon sx={{ color: "#06b6d4" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={<h3 className="text-base dark:text-white">Resumir conversa</h3>}>
              <IconButton onClick={() => openAIPrototypeModal("summarize-chat")}>
                <SummarizeIcon sx={{ color: "#8b5cf6" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={<h3 className="text-base dark:text-white">Analisar cliente</h3>}>
              <IconButton onClick={() => openAIPrototypeModal("analyze-customer")}>
                <InsightsIcon sx={{ color: "#f59e0b" }} />
              </IconButton>
            </Tooltip>
          </>
        )}
        {currentChat?.chatType === "wpp" && canInteract && (
          <>
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
          </>
        )}
        {currentChat?.chatType === "internal" &&
          canInteract &&
          !currentChat?.isGroup && (
          <>
            <Tooltip title={<h3 className="text-base dark:text-white">Finalizar conversa</h3>}>
              <IconButton onClick={openFinishInternalChatModal}>
                <AssignmentTurnedInIcon color="success" />
              </IconButton>
            </Tooltip>
          </>
        )}
        {onClose && (
          <IconButton
            onClick={onClose}
            className="mx-auto"
            sx={{
              color: "inherit",
              "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>
    </div>
  );
}
