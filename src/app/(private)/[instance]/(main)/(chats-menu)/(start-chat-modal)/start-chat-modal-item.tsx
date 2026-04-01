import { Customer, WppChatPriority, WppChatType, WppContact, WppMessage } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { IconButton, Avatar, Tooltip, Chip } from "@mui/material";
import { useCallback, useContext, useMemo } from "react";
import { DetailedChat, WhatsappContext } from "../../../whatsapp-context";
import { useAppContext } from "../../../app-context";
import SendTemplateModal from "@/lib/components/send-template-modal";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { toast } from "react-toastify";
import { useAuthContext } from "../../../../../auth-context";
import { getShortenedName } from "../../../../../../lib/utils/shorten-name";
import CustomerCrmDetailModal from "./customer-crm-detail-modal";
import type { CustomerProfileSummaryPayload } from "@/lib/types/customer-profile-summary";

interface StartChatModalItemProps {
  contact: WppContact;
  customer?: Customer | null;
  chatingWith?: string | null;
  profileSummary?: CustomerProfileSummaryPayload | null;
  isProfileLoading?: boolean;
  onSelect: () => void;
}

export default function StartChatModalItem({
  contact,
  customer = null,
  chatingWith = null,
  profileSummary = null,
  isProfileLoading = false,
  onSelect,
}: StartChatModalItemProps) {
  const {
    startChatByContactId,
    parameters,
    chats,
    monitorChats,
    openChat,
    loadChatMessages,
    prepareReadOnlyOpen,
    wppApi,
  } = useContext(WhatsappContext);
  const { openModal, closeModal } = useAppContext();
  const { pathname, instance, user } = useAuthContext()

  const shouldShowViewOnly = useMemo(() => {
    if (instance === "karsten") return true;
    if (user?.LOGIN === "infotec") return true;
    return false;
  }, [instance, user]);

  const isCustomerDetailEnabled = parameters["customer_detail_modal_enabled"] === "true";


  const handleClickStart = useCallback(() => {
    prepareReadOnlyOpen(false);

    if (parameters["is_official"] === "true") {
      setTimeout(() => {
        openModal(
          <SendTemplateModal
            onClose={closeModal}
            onSendTemplate={(data) => {
              prepareReadOnlyOpen(false);
              startChatByContactId(contact.id, data);
              closeModal();
            }}
            contact={contact}
            customer={customer}
          />,
        );
      }, 1000); // delay de 1000 ms (1 segundo)
    } else {
      startChatByContactId(contact.id);
      onSelect();
    }
  }, [contact.id, customer, onSelect, parameters, prepareReadOnlyOpen, startChatByContactId, openModal, closeModal]);

  const handleClickViewOnly = async () => {
    const normalizedPhone = contact.phone?.replace(/\D/g, "") || "";
    const allChats = [...chats, ...monitorChats];
    const targetChat =
      allChats.find((chat) => chat.contactId === contact.id) ||
      allChats.find((chat) => {
        if (!normalizedPhone || !chat.contact?.phone) return false;
        return chat.contact.phone.replace(/\D/g, "") === normalizedPhone;
      });

    try {
      prepareReadOnlyOpen(true);
      if (targetChat) {
        const loadedMessages = await loadChatMessages(targetChat);
        openChat(targetChat, loadedMessages);
        onSelect();
        return;
      }

      const response = await wppApi.current.ax.get("/api/whatsapp/messages", {
        params: {
          contactId: contact.id,
        },
      });

      const loadedMessages = (response.data?.data || []) as WppMessage[];

      if (!loadedMessages.length) {
        prepareReadOnlyOpen(false);
        toast.info("Nao existe historico de conversa para este contato.");
        return;
      }

      const sortedMessages = [...loadedMessages].sort((a, b) => {
        const first = new Date(a.sentAt || a.timestamp || 0).getTime();
        const second = new Date(b.sentAt || b.timestamp || 0).getTime();
        return first - second;
      });

      const readOnlyChat: DetailedChat = {
        id: -contact.id,
        instance: contact.instance,
        contactId: contact.id,
        userId: undefined,
        walletId: undefined,
        botId: undefined,
        resultId: undefined,
        sectorId: undefined,
        type: WppChatType.ACTIVE,
        priority: WppChatPriority.NORMAL,
        avatarUrl: contact.avatarUrl,
        isFinished: true,
        startedAt: new Date(sortedMessages[0]?.sentAt || Date.now()),
        finishedAt: null,
        finishedBy: null,
        isSchedule: false,
        contact,
        customer,
        schedule: null,
        isUnread: false,
        lastMessage: sortedMessages[sortedMessages.length - 1] || null,
        chatType: "wpp",
      };

      openChat(readOnlyChat, sortedMessages);
      onSelect();
    } catch (error) {
      prepareReadOnlyOpen(false);
      toast.error("Nao foi possivel abrir a conversa para visualizacao.");
      console.error("Erro ao abrir conversa em modo somente leitura", error);
    }
  };

  const handleOpenCustomerDetail = useCallback(() => {
    if (!customer?.CODIGO) {
      toast.info("Este contato não possui cliente vinculado.");
      return;
    }

    console.log("Parameters:", parameters);

    const canEditCustomerDetail = parameters["customer_detail_edit_enabled"] === "true";

    openModal(
      <CustomerCrmDetailModal
        customerId={customer.CODIGO}
        onClose={closeModal}
        canEdit={canEditCustomerDetail}
      />
    );
  }, [customer, openModal, closeModal, parameters]);

  const formatPhoneSafe = (phone: string) => {
    const digits = phone?.replace(/\D/g, "") ?? "";
    if (!digits) return phone;
    if (digits.length < 10 || digits.length > 13) return phone;

    try {
      return Formatter.phone(phone);
    } catch (error) {
      return phone;
    }
  };

  const qualificationChips = useMemo(() => {
    if (!profileSummary) {
      return [];
    }

    return [
      {
        key: "summary",
        label: profileSummary.label,
        color: profileSummary.color,
      },
      {
		key: "purchase-interest",
		label: profileSummary.purchaseInterest.label,
		color: profileSummary.purchaseInterest.color,
	  },
      {
        key: "interaction",
        label: profileSummary.tags.interaction.label,
        color: profileSummary.tags.interaction.color,
      },
      {
        key: "purchase",
        label: profileSummary.tags.purchase.label,
        color: profileSummary.tags.purchase.color,
      },
      {
        key: "age",
        label: profileSummary.tags.age.label,
        color: profileSummary.tags.age.color,
      },
    ];
  }, [profileSummary]);

  return (
    <div
      key={contact.id}
      className="group w-full transform rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:bg-slate-800/80"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
        {/* Avatar */}
        <Avatar
          src={contact.avatarUrl}
          alt={contact.name}
          className="self-center sm:self-center"
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

        <div className="grid flex-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4">
          {/* Informações do Contato */}
          <div className="flex min-h-[64px] min-w-0 flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <PersonIcon className="text-indigo-500" sx={{ fontSize: 18 }} />
              <span className="truncate text-base font-bold text-gray-800 dark:text-white">
                {contact.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIcon className="text-gray-500" sx={{ fontSize: 16 }} />
              <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                {formatPhoneSafe(contact.phone)}
              </span>
            </div>
          </div>

          {/* Informações do Cliente */}
          {customer ? (
            <div className="flex h-full min-h-[64px] min-w-0 flex-col justify-center gap-1 border-l-2 border-indigo-200 pl-4 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <BusinessIcon className="text-green-500" sx={{ fontSize: 18 }} />
                <span className="truncate text-sm font-semibold text-gray-800 dark:text-white">
                  {customer.RAZAO}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BadgeIcon className="text-gray-500" sx={{ fontSize: 16 }} />
                <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                  {formatCpfCnpj(customer.CPF_CNPJ)}
                </span>
              </div>
              {!!customer.COD_ERP && (
                <div className="flex items-center gap-2">
                  <BadgeIcon className="text-gray-500" sx={{ fontSize: 16 }} />
                  <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                    CÓDIGO ERP: {customer.COD_ERP}
                  </span>
                </div>
              )}

              {isProfileLoading ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip
                    size="small"
                    label="Qualificando..."
                    sx={{ height: 20, fontSize: "0.68rem", fontWeight: 600, "& .MuiChip-label": { px: 0.75 } }}
                  />
                </div>
              ) : qualificationChips.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {qualificationChips.map((chip, index) => (
                    <Chip
                      key={chip.key}
                      size="small"
                      label={chip.label}
                      sx={{
                        height: 20,
                        fontSize: "0.68rem",
                        fontWeight: index === 0 ? 700 : 600,
                        color: chip.color,
                        border: `1px solid ${chip.color}`,
                        backgroundColor: `${chip.color}14`,
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[64px] items-center border-l-2 border-gray-200 pl-4 dark:border-gray-700">
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
        <div className="flex shrink-0 items-center justify-end gap-2 sm:min-w-[120px]">
          {customer && (
            <Tooltip title="Detalhes do cliente" arrow>
              <IconButton
                onClick={handleOpenCustomerDetail}
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

          {shouldShowViewOnly && user?.NIVEL === "ADMIN" && (
            <Tooltip title="Visualizar conversa" arrow>
              <IconButton
                onClick={handleClickViewOnly}
                sx={{
                  background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                  color: "white",
                  transition: "all 0.3s",
                  "&:hover": {
                    background: "linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)",
                    transform: "scale(1.08)",
                  },
                }}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>)}
          {chatingWith ? (
            <Tooltip title={`Em conversa com ${chatingWith}`} arrow>
              <Chip
                label={getShortenedName(chatingWith)}
                color="error"
                size="small"
                sx={{
                  fontWeight: 600,
                  animation: "pulse-slow 2s ease-in-out infinite",
                  fontSize: "0.75rem",
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
    </div>
  );
}
