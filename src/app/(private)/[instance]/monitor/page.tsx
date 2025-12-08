"use client";
import filesService from "@/lib/services/files.service";
import toDateString from "@/lib/utils/date-string";
import { User } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { IconButton } from "@mui/material";
import { useContext } from "react";
import FinishChatModal from "../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../(main)/(chat)/(actions)/transfer-chat-modal";
import ChatProvider from "../(main)/(chat)/chat-context";
import ChatHeader from "../(main)/(chat)/chat-header";
import ChatMessagesList from "../(main)/(chat)/chat-messages-list";
import ChatMessagesListMonitor from "../(main)/(chat)/chat-messages-list-monitor";
import ChatSendMessageArea from "../(main)/(chat)/chat-send-message-area";
import { AppContext } from "../app-context";
import useInternalChatContext, {
  DetailedInternalChat,
  InternalChatContext,
} from "../internal-context";
import { DetailedChat, DetailedSchedule, useWhatsappContext } from "../whatsapp-context";
import MonitorCard from "./(components)/card";
import MonitorFilters from "./(components)/filters";
import useMonitorContext from "./context";

function getChatType(
  chat: DetailedInternalChat | DetailedChat | DetailedSchedule,
): "external-chat" | "finished-chat" | "internal-chat" | "internal-group" | "schedule" {
  if (!("chatType" in chat)) {
    return "schedule";
  }
  if (chat.chatType === "wpp") {
    return chat.isFinished ? "finished-chat" : "external-chat";
  }
  if (chat.chatType === "internal" && chat.isGroup) {
    return "internal-group";
  }
  if (chat.chatType === "internal" && !chat.isGroup) {
    return "internal-chat";
  }

  throw new Error(`Unknown chat type: ${chat.chatType}`);
}

function getEndDate(chat: DetailedInternalChat | DetailedChat) {
  if (!chat.startedAt) {
    return "Não iniciado";
  }

  if (!chat.finishedAt) {
    return "Em andamento";
  }

  const datestr = toDateString(chat.finishedAt);

  return datestr === "N/D" ? null : datestr;
}

function getChatUser(chat: DetailedInternalChat | DetailedChat, users: User[]): string {
  const user = users.find((u) => {
    if (chat.chatType === "wpp") {
      return u.CODIGO === chat.userId;
    }
    return u.CODIGO === chat.creatorId;
  });

  return user ? user.NOME : "BOT";
}

function getChatSector(
  chat: DetailedInternalChat | DetailedChat | DetailedSchedule,
  sectors: any[],
  users: User[],
) {
  if (!("chatType" in chat)) {
    const sector = sectors.find((s) => s.id === chat.sectorId);

    return sector ? sector.name : null;
  }

  if (chat.chatType === "wpp") {
    const sector = sectors.find((s) => s.id === chat.sectorId);
    return sector ? sector.name : null;
  }
  if (chat.chatType === "internal") {
    const creator = users.find((u) => u.CODIGO === chat.creatorId);
    const sector = creator && sectors.find((s) => s.id === creator.SETOR);
    return sector ? sector.name : null;
  }
}

function getChatImage(
  chat: DetailedInternalChat | DetailedChat | DetailedSchedule,
  users: User[],
): string {
  if (!("chatType" in chat)) {
    return "";
  }

  if (chat.chatType === "wpp") {
    return chat.avatarUrl || "";
  }

  if (chat.chatType === "internal" && chat.isGroup && chat.groupImageFileId) {
    return filesService.getFileDownloadUrl(chat.groupImageFileId);
  }

  if (chat.chatType === "internal" && !chat.isGroup) {
    const user = users.find((u) => u.CODIGO !== chat.creatorId);

    return user?.AVATAR_ID ? filesService.getFileDownloadUrl(user.AVATAR_ID) : "";
  }

  return "";
}

function getChatTitle(chat: DetailedInternalChat | DetailedChat | DetailedSchedule): string {
  if (!("chatType" in chat)) {
    return chat.contact?.name || "Contato excluído";
  }
  if (chat.chatType === "wpp") {
    return chat.contact?.name || "Contato excluído";
  }
  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.groupName || "Grupo Interno";
  }
  if (chat.chatType === "internal" && !chat.isGroup) {
    return chat.users.map((u) => u.NOME).join(" e ") || "Usuário Desconhecido";
  }
  return "Chat sem título";
}

function getChatCustomerName(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat) || chat.chatType === "wpp") {
    return chat.customer?.RAZAO || "Sem cliente associado";
  }
  return null;
}

function getChatCustomerDocument(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat) || chat.chatType === "wpp") {
    return chat.customer?.CPF_CNPJ || chat.customer ? "Documento não informado" : null;
  }
  return null;
}

function getChatContactNumber(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat) || chat.chatType === "wpp") {
    if (!chat.contact?.phone) {
      return "Whatsapp não encontrado";
    }
    try {
      return Formatter.phone(chat.contact.phone);
    } catch (error) {
      console.error("Erro ao formatar telefone:", chat.contact.phone, error);
      return chat.contact.phone; // Retorna o telefone sem formatação em caso de erro
    }
  }
  return null;
}

function getChatParticipants(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat)) {
    return [];
  }

  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.users.map((u) => u.NOME);
  }
  if (chat.chatType === "internal" && !chat.isGroup) {
    const otherUser = chat.users.find((u) => u.CODIGO !== chat.creatorId);
    return otherUser ? [otherUser.NOME] : [];
  }
  return [];
}

function getChatScheduledAt(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat)) {
    return toDateString(chat.scheduledAt);
  }

  if (chat.chatType === "wpp" && chat.schedule) {
    return toDateString(chat.schedule.scheduledAt);
  }

  return null;
}

function getChatScheduledFor(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat)) {
    return toDateString(chat.scheduleDate);
  }

  if (chat.chatType === "wpp" && chat.schedule) {
    return toDateString(chat.schedule.scheduleDate);
  }
  return null;
}

function getChatGroupName(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat)) {
    return "";
  }

  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.groupName || "Grupo sem nome";
  }

  return null;
}

function getChatGroupDescription(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
  if (!("chatType" in chat)) {
    return "";
  }

  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.groupDescription || "Sem descrição";
  }

  return null;
}

function getScheduledForUser(schedule: DetailedSchedule, users: User[]) {
  const scheduledFor = users.find((u) => u.CODIGO === schedule.scheduledFor);
  return scheduledFor ? scheduledFor.NOME : "Usuário Desconhecido";
}

export default function MonitorPage() {
  const { chats, filters, page, setPage, pageSize, totalCount, isLoading, refetch } =
    useMonitorContext();
  const { sectors = [] } = useWhatsappContext();
  const { users = [] } = useInternalChatContext();
  const { setCurrentChat, openChat, loadChatMessages } = useWhatsappContext();
  const { openInternalChat, setCurrentChat: setCurrentInternalChat } =
    useContext(InternalChatContext);

  const { openModal, closeModal } = useContext(AppContext);

  function getHandleTransfer(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
    if (!("chatType" in chat)) {
      return null;
    }

    if (chat.chatType === "wpp" && !chat.isFinished) {
      return () => {
        setCurrentChat(chat);
        openModal(<TransferChatModal />);
      };
    }
  }

  function getHandleView(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
    if (!("chatType" in chat)) {
      return null;
    }

    if (chat.chatType === "wpp") {
      return async () => {
        // Para chats finalizados, carrega as mensagens e passa diretamente para openChat
        let loadedMessages: any[] = [];
        if (chat.isFinished === true) {
          loadedMessages = await loadChatMessages(chat);
          // Passa as mensagens pré-carregadas diretamente para evitar problema de sincronização
          openChat(chat, loadedMessages);
        } else {
          // Para chats ativos, abre normalmente
          openChat(chat);
        }

        openModal(
          <div className="relative flex h-[80vh] w-[calc(100vw-4rem)] max-w-[1200px] flex-col rounded-md bg-slate-900 shadow-xl dark:bg-slate-800">
            <button
              onClick={() => closeModal?.()}
              className="absolute right-2 top-1 z-10 text-gray-700 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-300"
            >
              ✕
            </button>
            <ChatProvider>
              <ChatHeader
                avatarUrl={chat.avatarUrl}
                name={chat.contact?.name || "Contato excluído"}
                customerName={chat.customer?.RAZAO || "N/D"}
                chatType={chat.chatType}
                codErp={chat.customer?.COD_ERP || null}
                cpfCnpj={chat.customer?.CPF_CNPJ || null}
                customerId={chat.customer?.CODIGO || null}
                startDate={chat.startedAt ? new Date(chat.startedAt).toDateString() : null}
                phone={chat.contact?.phone || "N/D"}
              />
              <div className="scrollbar-whatsapp flex-1 bg-white text-black drop-shadow-md dark:bg-slate-900 dark:text-white">
                <ChatMessagesList />
              </div>
              <div className="border-t border-gray-200 bg-white p-2 text-black dark:border-gray-700 dark:bg-slate-900">
                {chat.isFinished === false && <ChatSendMessageArea />}
              </div>
            </ChatProvider>
          </div>,
        );
      };
    }
    if (chat.chatType === "internal") {
      return () => {
        setCurrentInternalChat(chat);
        openInternalChat(chat, false);
        openModal(
          <div className="relative flex h-[80vh] w-[calc(100vw-4rem)] max-w-[1200px] flex-col rounded-md bg-slate-900 shadow-xl dark:bg-slate-800">
            <button
              onClick={() => closeModal?.()}
              className="absolute right-2 top-1 z-10 text-gray-700 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-300"
            >
              ✕
            </button>
            <ChatProvider>
              <ChatHeader
                avatarUrl={""}
                name={chat.groupName || chat.users[0].NOME}
                customerName={chat.groupDescription || chat.users[0].NOME_EXIBICAO || ""}
                phone={chat.users[0].SETOR_NOME || ""}
                chatType={chat.chatType}
                codErp={null}
                cpfCnpj={null}
                customerId={null}
                startDate={chat.startedAt ? new Date(chat.startedAt).toDateString() : null}
              />
              <div className="scrollbar-whatsapp flex-1 bg-white text-black drop-shadow-md dark:bg-slate-900 dark:text-white">
                <ChatMessagesListMonitor />
              </div>
              <div className="border-t border-gray-200 bg-white p-2 text-black dark:border-gray-700 dark:bg-slate-900">
                <ChatSendMessageArea />
              </div>
            </ChatProvider>
          </div>,
        );
      };
    }
  }

  function getHandleFinish(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
    if (!("chatType" in chat)) {
      return null;
    }

    if (chat.chatType === "wpp" && !chat.isFinished) {
      return () => {
        setCurrentChat(chat);
        openModal(<FinishChatModal />);
        refetch();
      };
    }

    return null;
  }
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedChats = Array.isArray(chats) ? chats : [];

  return (
    <div className="mx-auto grid h-[98%] w-full max-w-[1366px] grid-rows-[auto_1fr] gap-0">
      <div className="flex w-full gap-2 overflow-hidden p-4">
        <MonitorFilters />
        <main className="scrollbar-whatsapp grid grow grid-rows-[auto_1fr_auto] gap-4">
          {/* Contador de Resultados */}
          <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-indigo-200 to-purple-200 px-6 py-3 shadow-sm dark:from-indigo-800/30 dark:to-purple-800/30">
            <div className="flex items-center gap-3">
              <AssessmentIcon
                className="text-indigo-600 dark:text-indigo-400"
                sx={{ fontSize: 28 }}
              />
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Monitor de Conversas
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {isLoading ? (
                    "Carregando..."
                  ) : (
                    <>
                      Exibindo{" "}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {paginatedChats.length}
                      </span>{" "}
                      de{" "}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {totalCount}
                      </span>{" "}
                      conversas
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Página</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {page} / {totalPages || 1}
                </p>
              </div>
              {totalPages > 1 && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    sx={{
                      border: "1px solid",
                      borderColor: "rgb(229, 231, 235)",
                      "&:hover": {
                        borderColor: "rgb(99, 102, 241)",
                        backgroundColor: "rgb(238, 242, 255)",
                      },
                      "&.Mui-disabled": {
                        borderColor: "rgb(229, 231, 235)",
                        opacity: 0.5,
                      },
                    }}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 20 }} />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    sx={{
                      border: "1px solid",
                      borderColor: "rgb(229, 231, 235)",
                      "&:hover": {
                        borderColor: "rgb(99, 102, 241)",
                        backgroundColor: "rgb(238, 242, 255)",
                      },
                      "&.Mui-disabled": {
                        borderColor: "rgb(229, 231, 235)",
                        opacity: 0.5,
                      },
                    }}
                  >
                    <ChevronRightIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </>
              )}
            </div>
          </div>

          <ul className="overflow-auto">
            {paginatedChats.map((chat) => {
              if ("chatType" in chat) {
                return (
                  <MonitorCard
                    key={`${chat.chatType}-${chat.id}`}
                    type={getChatType(chat)}
                    startDate={toDateString(chat.startedAt)}
                    endDate={getEndDate(chat)}
                    userName={getChatUser(chat, users)}
                    sectorName={getChatSector(chat, sectors, users)}
                    imageUrl={getChatImage(chat, users)}
                    chatTitle={getChatTitle(chat)}
                    customerName={getChatCustomerName(chat)}
                    contactNumber={getChatContactNumber(chat)}
                    customerDocument={getChatCustomerDocument(chat)}
                    scheduledAt={getChatScheduledAt(chat)}
                    scheduledFor={getChatScheduledFor(chat)}
                    isScheduled={"schedule" in chat && chat.schedule ? true : false}
                    participants={getChatParticipants(chat)}
                    groupName={getChatGroupName(chat)}
                    groupDescription={getChatGroupDescription(chat)}
                    handleTransfer={getHandleTransfer(chat)}
                    handleView={getHandleView(chat)}
                    handleFinish={getHandleFinish(chat)}
                  />
                );
              }
              // Optionally handle DetailedSchedule or skip rendering
              return (
                <MonitorCard
                  key={`schedule-${chat.id}`}
                  type={"schedule"}
                  startDate={"Não Iniciado"}
                  endDate={"."}
                  userName={getScheduledForUser(chat, users)}
                  sectorName={getChatSector(chat, sectors, users)}
                  imageUrl={getChatImage(chat, users)}
                  chatTitle={getChatTitle(chat)}
                  customerName={getChatCustomerName(chat)}
                  contactNumber={getChatContactNumber(chat)}
                  customerDocument={getChatCustomerDocument(chat)}
                  scheduledAt={getChatScheduledAt(chat)}
                  scheduledFor={getChatScheduledFor(chat)}
                  isScheduled={
                    !("chatType" in chat) || ("schedule" in chat && chat.schedule) ? true : false
                  }
                  participants={getChatParticipants(chat)}
                  groupName={getChatGroupName(chat)}
                  groupDescription={getChatGroupDescription(chat)}
                  handleTransfer={getHandleTransfer(chat)}
                  handleView={getHandleView(chat)}
                  handleFinish={getHandleFinish(chat)}
                />
              );
            })}
          </ul>

          {chats.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
              <SearchOffIcon sx={{ fontSize: 80, opacity: 0.3 }} />
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300">
                  Nenhuma conversa encontrada
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Ajuste os filtros ou aguarde novas conversas
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
