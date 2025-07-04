"use client";
import { useContext, useState } from "react";
import MonitorCard from "./(components)/card";
import MonitorFilters from "./(components)/filters";
import useMonitorContext from "./context";
import useInternalChatContext, {
  DetailedInternalChat,
  InternalChatContext,
} from "../internal-context";
import { DetailedChat, useWhatsappContext } from "../whatsapp-context";
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

function getChatType(
  chat: DetailedInternalChat | DetailedChat,
): "external-chat" | "internal-chat" | "internal-group" | "scheduled-chat" {
  if (chat.chatType === "wpp") {
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

function getChatSector(chat: DetailedInternalChat | DetailedChat, sectors: any[], users: User[]) {
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

function getChatImage(chat: DetailedInternalChat | DetailedChat, users: User[]): string {
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

function getChatTitle(chat: DetailedInternalChat | DetailedChat): string {
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

function getChatCustomerName(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "wpp") {
    return chat.customer?.RAZAO || "Sem cliente associado";
  }
  return null;
}

function getChatCustomerDocument(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "wpp") {
    return chat.customer?.CPF_CNPJ || chat.customer ? "Documento não informado" : null;
  }
  return null;
}

function getChatContactNumber(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "wpp") {
    return chat.contact?.phone ? Formatter.phone(chat.contact.phone) : "Whatsapp não encontrado";
  }
  return null;
}

function getChatParticipants(chat: DetailedInternalChat | DetailedChat, users: User[]) {
  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.users.map((u) => u.NOME);
  }
  if (chat.chatType === "internal" && !chat.isGroup) {
    const otherUser = chat.users.find((u) => u.CODIGO !== chat.creatorId);
    return otherUser ? [otherUser.NOME] : [];
  }
  return [];
}

function getChatScheduledAt(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "wpp" && chat.schedule) {
    return toDateString(chat.schedule.scheduledAt);
  }

  return null;
}

function getChatScheduledFor(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "wpp" && chat.schedule) {
    return toDateString(chat.schedule.scheduleDate);
  }
  return null;
}

function getChatGroupName(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.groupName || "Grupo sem nome";
  }

  return null;
}

function getChatGroupDescription(chat: DetailedInternalChat | DetailedChat) {
  if (chat.chatType === "internal" && chat.isGroup) {
    return chat.groupDescription || "Sem descrição";
  }

  return null;
}

export default function MonitorPage() {
  const { chats } = useMonitorContext();
  const { sectors } = useWhatsappContext();
  const { users } = useInternalChatContext();
  const { getChatsMonitor, monitorChats, setCurrentChat, openChat, getChats } =
    useWhatsappContext();
  const {
    openInternalChat,
    getInternalChatsMonitor,
    monitorInternalChats,
    setCurrentChat: setCurrentInternalChat,
  } = useContext(InternalChatContext);
  const { openModal, closeModal } = useContext(AppContext);

  function getHandleTransfer(chat: DetailedInternalChat | DetailedChat) {
    if (chat.chatType === "wpp") {
      return () => {
        setCurrentChat(chat);
        openModal(<TransferChatModal />);
      };
    }
  }

  function getHandleView(chat: DetailedInternalChat | DetailedChat) {
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
        setCurrentInternalChat(chat);
        openInternalChat(chat);
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

  function getHandleFinish(chat: DetailedInternalChat | DetailedChat) {
    if (chat.chatType === "wpp") {
      return () => {
        setCurrentChat(chat);
        openModal(<FinishChatModal />);
        getChatsMonitor();
      };
    }

    return null;
  }

  return (
    <div className="mx-auto grid h-[98%] w-full max-w-[1366px] grid-rows-[auto_1fr] gap-0">
      <div className="flex w-full gap-2 overflow-hidden p-4">
        <MonitorFilters />
        <main className="scrollbar-whatsapp grow overflow-auto">
          {chats.map((chat) => (
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
          ))}
        </main>
      </div>
    </div>
  );
}
