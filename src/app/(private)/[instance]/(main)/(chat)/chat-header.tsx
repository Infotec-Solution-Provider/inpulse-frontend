import AIPrototypeModal, { AIPrototypeMode } from "@/lib/components/ai-prototype-modal";
import { AI_PRESENTATION_MODE } from "@/lib/ai-prototype/config";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { Formatter, sanitizeErrorMessage } from "@in.pulse-crm/utils";
import reportsService from "@/lib/services/reports.service";
import { UserRole } from "@/lib/sdk-local";
import { Avatar, Button, Menu, MenuItem } from "@mui/material";
import {
  Bot,
  ChartNoAxesCombined,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { OperationalIconButton } from "@/lib/ui-system/actions";
import { UiIcon, type UiIconName } from "@/lib/ui-system/icons";
import { useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppContext } from "../../app-context";
import { useWhatsappContext } from "../../whatsapp-context";
import { ChatContext } from "./chat-context";
import EditContactModal from "./(actions)/edit-contact-modal";
import FinishChatModal from "./(actions)/finish-chat-modal";
import FinishInternalChatModal from "./(actions)/finish-internal-chat-modal";
import ScheduleChatModal from "./(actions)/schedule-chat-modal";
import TransferChatModal from "./(actions)/transfer-chat-modal";
import CustomerCrmDetailModal from "../(chats-menu)/(start-chat-modal)/customer-crm-detail-modal";
import AgentAuditDrawer from "./(actions)/agent-audit-drawer";
import { useAuthContext } from "@/app/auth-context";
import { chatHasAgentMessages } from "@/lib/utils/ai-agent-labels";
import "./attendance-composer.css";

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
  const { instance, user, token } = useAuthContext();
  const router = useRouter();
  const { openModal, closeModal } = useContext(AppContext);
  const { currentChat, currentChatMessages, parameters } = useWhatsappContext();
  const { applySuggestedText, isReadOnlyMode } = useContext(ChatContext);
  const canInteract = !isReadOnlyMode && currentChat?.isFinished === false;
  const userLevel = String(user?.NIVEL ?? "");
  const canExportChat =
    (userLevel === UserRole.ADMIN || userLevel === "SUPERVISOR") &&
    currentChat?.chatType === "wpp" &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.chatExport);
  const canOpenAIActions =
    AI_PRESENTATION_MODE &&
    currentChat?.chatType === "wpp" &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.ai) &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.aiSupervisor);
  const canOpenSupervisorAssistant =
    currentChat?.chatType === "wpp" &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.ai) &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.aiSupervisor);
  const canOpenCustomerDetail = currentChat?.chatType === "wpp" && !!customerId;
  // O agente pode já ter saído do chat (transferência, pausa), mas as respostas dele ficam com agentId.
  // As mensagens abertas são as do contato inteiro: só contam as deste atendimento.
  const currentChatId = currentChat?.id;
  const hasAgentMessages = useMemo(
    () => chatHasAgentMessages(currentChatMessages, currentChatId),
    [currentChatMessages, currentChatId],
  );
  const hasAiAgent =
    currentChat?.chatType === "wpp" &&
    (!!(currentChat as { agentId?: number | null }).agentId || hasAgentMessages) &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.ai) &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.aiAgents);
  const hasMobileActions =
    canOpenCustomerDetail ||
    canOpenAIActions ||
    canOpenSupervisorAssistant ||
    hasAiAgent ||
    canInteract ||
    canExportChat;

  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [mobileActionsAnchor, setMobileActionsAnchor] = useState<null | HTMLElement>(null);

  const openSupervisorAssistant = () => {
    const query = new URLSearchParams();
    if (currentChat?.id) query.set("chatId", String(currentChat.id));
    if (customerId) query.set("customerId", String(customerId));
    const suffix = query.toString();
    router.push(`/${instance}/ai-supervisor${suffix ? `?${suffix}` : ""}`);
  };

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

  const exportChat = async () => {
    if (!currentChat?.id || !token) return;
    try {
      reportsService.setAuth(`Bearer ${token}`);
      await reportsService.generateChatsReport({ chatId: currentChat.id, format: "pdf" });
      toast.success("Exportação iniciada! Acompanhe em Relatórios > Conversas.");
    } catch (error) {
      toast.error("Falha ao exportar conversa!\n" + sanitizeErrorMessage(error));
    }
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

  type HeaderAction = {
    key: string;
    label: string;
    run: () => void;
    name?: UiIconName;
    icon?: LucideIcon;
  };
  const primaryActions: HeaderAction[] = [];
  const extraActions: HeaderAction[] = [];
  if (canOpenCustomerDetail)
    primaryActions.push({
      key: "details",
      label: "Consultar cliente",
      name: "info",
      run: openCustomerDetailModal,
    });
  if (currentChat?.chatType === "wpp" && canInteract) {
    primaryActions.push({
      key: "edit",
      label: "Editar contato",
      name: "edit",
      run: openEditContactModal,
    });
    primaryActions.push({
      key: "schedule",
      label: "Agendar retorno",
      name: "calendar",
      run: openScheduleChatModal,
    });
  }
  if (canOpenSupervisorAssistant)
    extraActions.push({
      key: "assistant",
      label: "Abrir no Assistente",
      icon: Bot,
      run: openSupervisorAssistant,
    });
  if (hasAiAgent)
    extraActions.push({
      key: "agent",
      label: "Logs do agente de IA",
      icon: ShieldCheck,
      run: () => setAuditDrawerOpen(true),
    });
  if (canOpenAIActions) {
    extraActions.push({
      key: "suggest",
      label: "Sugerir resposta",
      icon: Sparkles,
      run: () => openAIPrototypeModal("suggest-response"),
    });
    extraActions.push({
      key: "summary",
      label: "Resumir conversa",
      icon: FileText,
      run: () => openAIPrototypeModal("summarize-chat"),
    });
    extraActions.push({
      key: "analyze",
      label: "Analisar cliente",
      icon: ChartNoAxesCombined,
      run: () => openAIPrototypeModal("analyze-customer"),
    });
  }
  if (canExportChat)
    extraActions.push({
      key: "export",
      label: "Exportar conversa",
      icon: Download,
      run: () => void exportChat(),
    });
  const canTransfer = currentChat?.chatType === "wpp" && canInteract;
  const canFinish =
    canInteract &&
    (currentChat?.chatType === "wpp" ||
      (currentChat?.chatType === "internal" && !currentChat.isGroup));
  const finishConversation =
    currentChat?.chatType === "internal" ? openFinishInternalChatModal : openFinishChatModal;
  const menuActions: HeaderAction[] = [
    ...primaryActions,
    ...(canTransfer
      ? [
          {
            key: "transfer",
            label: "Transferir conversa",
            name: "transfer" as const,
            run: openTransferChatModal,
          },
        ]
      : []),
    ...(canFinish
      ? [
          {
            key: "finish",
            label: "Finalizar conversa",
            name: "finish" as const,
            run: finishConversation,
          },
        ]
      : []),
    ...extraActions,
  ];
  const distinctCustomerName =
    customerName?.trim() &&
    customerName.trim().toLocaleLowerCase() !== name.trim().toLocaleLowerCase();
  const actionIcon = (action: HeaderAction) =>
    action.icon ? (
      <UiIcon icon={action.icon} scale="toolbar" />
    ) : (
      <UiIcon name={action.name!} scale="toolbar" />
    );

  return (
    <>
      <header className="ip-attendance-header" aria-label="Conversa em atendimento">
        <div className="ip-attendance-header-row">
          {onClose && (
            <span className="ip-attendance-header-back">
              <OperationalIconButton label="Voltar para conversas" onClick={onClose}>
                <UiIcon name="back" scale="toolbar" />
              </OperationalIconButton>
            </span>
          )}
          <Avatar variant="rounded" alt="" src={avatarUrl || ""} className="ip-attendance-avatar">
            {name.trim().charAt(0).toLocaleUpperCase()}
          </Avatar>
          <div className="ip-attendance-identity">
            <h2 title={name}>{name}</h2>
            {distinctCustomerName && (
              <p className="ip-attendance-customer" title={customerName || undefined}>
                {customerName}
              </p>
            )}
            <div className="ip-attendance-contact-meta">
              {phone && <span>{safeFormatPhone(phone)}</span>}
              {cpfCnpj && <span>CPF/CNPJ: {cpfCnpj}</span>}
              {customerId && (
                <span className="ip-attendance-customer-codes">
                  Cliente {customerId}
                  {codErp ? ` · ERP ${codErp}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="ip-attendance-header-actions">
            {primaryActions.map((action) => (
              <OperationalIconButton
                key={action.key}
                label={`${action.label}: ${name}`}
                tooltip={action.label}
                onClick={action.run}
              >
                {actionIcon(action)}
              </OperationalIconButton>
            ))}
            {canTransfer && (
              <Button
                className="ip-attendance-header-commit"
                variant="outlined"
                onClick={openTransferChatModal}
                startIcon={<UiIcon name="transfer" scale="row" />}
              >
                Transferir
              </Button>
            )}
            {canFinish && (
              <Button
                className="ip-attendance-header-commit"
                variant="outlined"
                onClick={finishConversation}
                startIcon={<UiIcon name="finish" scale="row" />}
              >
                Finalizar
              </Button>
            )}
          </div>
          {hasMobileActions && (
            <div
              className={`ip-attendance-header-menu ${extraActions.length === 0 ? "ip-attendance-header-menu-compact" : ""}`}
            >
              <OperationalIconButton
                label={`Ações da conversa com ${name}`}
                tooltip="Ações da conversa"
                aria-haspopup="menu"
                aria-expanded={Boolean(mobileActionsAnchor)}
                onClick={(event) => setMobileActionsAnchor(event.currentTarget)}
              >
                <UiIcon name="more" scale="toolbar" />
              </OperationalIconButton>
              <Menu
                anchorEl={mobileActionsAnchor}
                open={Boolean(mobileActionsAnchor)}
                onClose={() => setMobileActionsAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ list: { "aria-label": "Ações da conversa" } }}
              >
                {menuActions.map((action) => (
                  <MenuItem
                    key={action.key}
                    className="ip-attendance-menu-item"
                    onClick={() => {
                      setMobileActionsAnchor(null);
                      action.run();
                    }}
                  >
                    {actionIcon(action)}
                    <span>{action.label}</span>
                  </MenuItem>
                ))}
              </Menu>
            </div>
          )}
          {onClose && (
            <span className="ip-attendance-header-close">
              <OperationalIconButton label="Fechar conversa" onClick={onClose}>
                <UiIcon name="close" scale="toolbar" />
              </OperationalIconButton>
            </span>
          )}
        </div>
      </header>
      {auditDrawerOpen && currentChat?.id && (
        <AgentAuditDrawer chatId={currentChat.id} onClose={() => setAuditDrawerOpen(false)} />
      )}
    </>
  );
}
