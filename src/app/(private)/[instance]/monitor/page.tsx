"use client";
import { useContext, useState } from "react";
import MonitorCard from "./(components)/card";
import MonitorFilters from "./(components)/filters";
import useMonitorContext from "./context";
import useInternalChatContext, {
  DetailedInternalChat,
  InternalChatContext,
} from "../internal-context";
import { DetailedChat, DetailedSchedule, useWhatsappContext } from "../whatsapp-context";
import toDateString from "@/lib/utils/date-string";
import { User } from "@in.pulse-crm/sdk";
import filesService from "@/lib/services/files.service";
import { Formatter } from "@in.pulse-crm/utils";
import { AppContext } from "../app-context";
import TransferChatModal from "../(main)/(chat)/(actions)/transfer-chat-modal";
import ChatProvider from "../(main)/(chat)/chat-context";
import ChatHeader from "../(main)/(chat)/chat-header";
import ChatMessagesList from "../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../(main)/(chat)/chat-send-message-area";
import ChatMessagesListMonitor from "../(main)/(chat)/chat-messages-list-monitor";
import FinishChatModal from "../(main)/(chat)/(actions)/finish-chat-modal";
import { Pagination } from "@mui/material";

function getChatType(
  chat: DetailedInternalChat | DetailedChat | DetailedSchedule,
): "external-chat" | "internal-chat" | "internal-group" | "scheduled-chat" | "schedule" {

  if (!("chatType" in chat)) {
    return "schedule";
  }
  if (chat.chatType === "wpp" && !chat.isSchedule) {
    return "external-chat";
  }
  if (chat.chatType === "internal" && chat.isGroup) {
    return "internal-group";
  }
  if (chat.chatType === "internal" && !chat.isGroup) {
    return "internal-chat";
  }

  return "scheduled-chat";
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

function getChatSector(chat: DetailedInternalChat | DetailedChat | DetailedSchedule, sectors: any[], users: User[]) {
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

function getChatImage(chat: DetailedInternalChat | DetailedChat | DetailedSchedule, users: User[]): string {
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
    return chat.contact?.phone ? Formatter.phone(chat.contact.phone) : "Whatsapp não encontrado";
  }
  return null;
}

function getChatParticipants(chat: DetailedInternalChat | DetailedChat | DetailedSchedule, users: User[]) {
  if (!("chatType" in chat)) {
    return []
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
  const { chats } = useMonitorContext();
  const { sectors } = useWhatsappContext();
  const { users } = useInternalChatContext();
  const { getChatsMonitor, setCurrentChat, openChat } =
    useWhatsappContext();
  const {
    openInternalChat,
    setCurrentChat: setCurrentInternalChat,
  } = useContext(InternalChatContext);

  const { openModal, closeModal } = useContext(AppContext);

  function getHandleTransfer(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
    if (!("chatType" in chat)) {
      return null;
    }

    if (chat.chatType === "wpp") {
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
      return () => {
        setCurrentChat(chat);
        openChat(chat);
        openModal(
          <div className="relative flex h-[80vh] w-[500px] flex-col rounded-md bg-slate-900 shadow-xl dark:bg-slate-800">
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
                phone={chat.contact?.phone || "N/D"}
              />
              <div className="scrollbar-whatsapp flex-1 bg-white text-black drop-shadow-md dark:bg-slate-900 dark:text-white">
                <ChatMessagesList />
              </div>
              <div className="border-t border-gray-200 bg-white p-2 text-black dark:border-gray-700 dark:bg-slate-900">
                <ChatSendMessageArea />
              </div>
            </ChatProvider>
          </div>,
        );
      };
    }
    if (chat.chatType === "internal") {
      return () => {
        console.log(chat);

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

    if (chat.chatType === "wpp") {
      return () => {
        setCurrentChat(chat);
        openModal(<FinishChatModal />);
        getChatsMonitor();
      };
    }

    return null;
  }

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(chats.length / pageSize);
  const paginatedChats = chats.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mx-auto grid h-[98%] w-full max-w-[1366px] grid-rows-[auto_1fr] gap-0">
      <div className="flex w-full gap-2 overflow-hidden p-4">
        <MonitorFilters />
        <main className="scrollbar-whatsapp grow  grid grid-rows-[1fr_max-content] gap-4">
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
                    participants={getChatParticipants(chat, users)}
                    groupName={getChatGroupName(chat)}
                    groupDescription={getChatGroupDescription(chat)}
                    handleTransfer={getHandleTransfer(chat)}
                    handleView={getHandleView(chat)}
                    handleFinish={getHandleFinish(chat)}
                  />
                );
              }
              // Optionally handle DetailedSchedule or skip rendering
              return <MonitorCard
                key={`schedule-${chat.id}`}
                type={"scheduled-chat"}
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
                isScheduled={!("chatType" in chat) || "schedule" in chat && chat.schedule ? true : false}
                participants={getChatParticipants(chat, users)}
                groupName={getChatGroupName(chat)}
                groupDescription={getChatGroupDescription(chat)}
                handleTransfer={getHandleTransfer(chat)}
                handleView={getHandleView(chat)}
                handleFinish={getHandleFinish(chat)}
              />;
            })}
          </ul>
          {chats.length === 0 && (
            <div className="text-center text-gray-500 mt-8">Nenhum chat encontrado.</div>
          )}
          <div className="flex justify-center mt-4">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="medium"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
