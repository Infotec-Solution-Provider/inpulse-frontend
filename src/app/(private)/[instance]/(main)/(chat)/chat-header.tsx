import { AI_PRESENTATION_MODE } from "@/lib/ai-prototype/config";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { Formatter } from "@in.pulse-crm/utils";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SummarizeIcon from "@mui/icons-material/Summarize";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import dynamic from "next/dynamic";
import { useContext, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AppContext } from "../../app-context";
import { useWhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";

type AIPrototypeMode = "suggest-response" | "summarize-chat" | "analyze-customer";

const AIPrototypeModal = dynamic(() => import("@/lib/components/ai-prototype-modal"), {
  ssr: false,
});
const EditContactModal = dynamic(() => import("./(actions)/edit-contact-modal"), { ssr: false });
const FinishChatModal = dynamic(() => import("./(actions)/finish-chat-modal"), { ssr: false });
const FinishInternalChatModal = dynamic(() => import("./(actions)/finish-internal-chat-modal"), {
  ssr: false,
});
const ScheduleChatModal = dynamic(() => import("./(actions)/schedule-chat-modal"), { ssr: false });
const TransferChatModal = dynamic(() => import("./(actions)/transfer-chat-modal"), { ssr: false });
const CustomerCrmDetailModal = dynamic(
  () => import("../(chats-menu)/(start-chat-modal)/customer-crm-detail-modal"),
  { ssr: false },
);
const AgentAuditDrawer = dynamic(() => import("./(actions)/agent-audit-drawer"), { ssr: false });

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
  const { openModal, closeModal } = useContext(AppContext);
  const { currentChat, currentChatMessages, parameters } = useWhatsappContext();
  const { applySuggestedText, isReadOnlyMode } = useContext(ChatContext);
  const canInteract = !isReadOnlyMode && currentChat?.isFinished === false;
  const canOpenAIActions =
    AI_PRESENTATION_MODE &&
    currentChat?.chatType === "wpp" &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.ai) &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.aiSupervisor);
  const canOpenCustomerDetail = currentChat?.chatType === "wpp" && !!customerId;
  const hasAiAgent =
    currentChat?.chatType === "wpp" &&
    !!(currentChat as { agentId?: number | null }).agentId &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.ai) &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.aiAgents);
  const hasMobileActions = canOpenCustomerDetail || canOpenAIActions || hasAiAgent || canInteract;

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [mobileActionsAnchor, setMobileActionsAnchor] = useState<null | HTMLElement>(null);

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

  const openCustomerDetailModal = () => {
    if (!customerId) {
      toast.info("Este contato não possui cliente vinculado.");
      return;
    }

    openModal(
      <CustomerCrmDetailModal
        customerId={customerId}
        onClose={closeModal}
        canEdit={parameters["customer_detail_edit_enabled"] === "true"}
      />,
    );
  };

  const openAIPrototypeModal = (mode: AIPrototypeMode) => {
    openModal(
      <AIPrototypeModal
        mode={mode}
        onApplySuggestion={mode === "suggest-response" ? applySuggestedText : undefined}
        context={{
          chatId: currentChat?.id ?? null,
          contactName: name,
          customerName,
          customerId,
          phone,
          startedAt: currentChat?.startedAt ? String(currentChat.startedAt) : null,
          messageCount: currentChatMessages.length,
          lastMessage: lastMessageBody,
        }}
      />,
    );
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b bg-slate-200 px-2 py-2 dark:border-slate-700 dark:bg-slate-800 sm:px-4">
        {onClose && (
          <IconButton
            onClick={onClose}
            className="shrink-0 md:hidden"
            aria-label="Voltar para conversas"
            sx={{ color: "inherit" }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-slate-300 px-2 py-1 dark:bg-slate-700">
            <Avatar
              variant="rounded"
              alt={name}
              src={avatarUrl || ""}
              sx={{ width: { xs: 44, sm: 52, md: 60 }, height: { xs: 44, sm: 52, md: 60 } }}
            />
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-800 dark:text-slate-200">{name}</h2>
              <h2 className="truncate text-sm text-slate-700 dark:text-slate-200">
                {customerName || "Contato Não Atribuído"}
              </h2>
              <h2 className="truncate text-sm text-slate-400 dark:text-slate-300">
                {safeFormatPhone(phone)}
              </h2>
            </div>
          </div>
          {customerId && (
            <div className="hidden flex-col rounded-md bg-slate-300 px-2 py-1 text-sm dark:bg-slate-700 md:flex">
              <span className="text-slate-800 dark:text-slate-200">
                <b>CPF/CNPJ: </b>
                {cpfCnpj || "N/D"}
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                <b>Código Cliente: </b>
                {customerId || "N/D"}
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                <b>Código ERP: </b>
                {codErp || "N/D"}
              </span>
            </div>
          )}
        </div>
        <div className="hidden items-center md:flex">
          {hasAiAgent && (
            <Tooltip title={<h3 className="text-base dark:text-white">Logs do Agente de IA</h3>}>
              <IconButton onClick={() => setAuditDrawerOpen(true)}>
                <ManageAccountsIcon sx={{ color: "#8b5cf6" }} />
              </IconButton>
            </Tooltip>
          )}
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
          {canOpenCustomerDetail && (
            <Tooltip title={<h3 className="text-base dark:text-white">Detalhes do cliente</h3>}>
              <IconButton
                onClick={openCustomerDetailModal}
                sx={{
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  color: "white",
                  transition: "all 0.3s",
                  "&:hover": {
                    background: "linear-gradient(135deg, #047857 0%, #065f46 100%)",
                    transform: "scale(1.08)",
                  },
                }}
              >
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>
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
          {currentChat?.chatType === "internal" && canInteract && !currentChat?.isGroup && (
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
              sx={{
                color: "inherit",
                "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </div>
        {hasMobileActions && (
          <div className="md:hidden">
            <IconButton
              onClick={(event) => setMobileActionsAnchor(event.currentTarget)}
              aria-label="Ações da conversa"
              sx={{ color: "inherit" }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={mobileActionsAnchor}
              open={Boolean(mobileActionsAnchor)}
              onClose={() => setMobileActionsAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {canOpenCustomerDetail && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openCustomerDetailModal();
                  }}
                >
                  <InfoOutlinedIcon className="mr-3" color="success" /> Detalhes do cliente
                </MenuItem>
              )}
              {canOpenAIActions && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openAIPrototypeModal("suggest-response");
                  }}
                >
                  <AutoAwesomeIcon className="mr-3" color="info" /> Sugerir resposta
                </MenuItem>
              )}
              {hasAiAgent && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    setAuditDrawerOpen(true);
                  }}
                >
                  <ManageAccountsIcon className="mr-3" color="secondary" /> Logs do agente
                </MenuItem>
              )}
              {currentChat?.chatType === "wpp" && canInteract && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openEditContactModal();
                  }}
                >
                  <EditIcon className="mr-3" color="info" /> Editar contato
                </MenuItem>
              )}
              {currentChat?.chatType === "wpp" && canInteract && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openTransferChatModal();
                  }}
                >
                  <SyncAltIcon className="mr-3" color="secondary" /> Transferir conversa
                </MenuItem>
              )}
              {currentChat?.chatType === "wpp" && canInteract && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openScheduleChatModal();
                  }}
                >
                  <ScheduleIcon className="mr-3" color="warning" /> Agendar retorno
                </MenuItem>
              )}
              {currentChat?.chatType === "wpp" && canInteract && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openFinishChatModal();
                  }}
                >
                  <AssignmentTurnedInIcon className="mr-3" color="success" /> Finalizar conversa
                </MenuItem>
              )}
              {currentChat?.chatType === "internal" && canInteract && !currentChat.isGroup && (
                <MenuItem
                  onClick={() => {
                    setMobileActionsAnchor(null);
                    openFinishInternalChatModal();
                  }}
                >
                  <AssignmentTurnedInIcon className="mr-3" color="success" /> Finalizar conversa
                </MenuItem>
              )}
            </Menu>
          </div>
        )}
      </div>
      {auditDrawerOpen && currentChat?.id && (
        <AgentAuditDrawer chatId={currentChat.id} onClose={() => setAuditDrawerOpen(false)} />
      )}
    </>
  );
}
