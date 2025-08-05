"use client";
import { useContext, useState } from "react";
import MonitorCard from "./(components)/card";
import MonitorFilters from "./(components)/filters";
import useMonitorContext from "./monitor-context";
import useInternalChatContext, {
  DetailedInternalChat,
  InternalChatContext,
} from "../internal-context";
import { DetailedChat, DetailedSchedule, useWhatsappContext } from "../whatsapp-context";
import { AppContext } from "../app-context";
import TransferChatModal from "../(main)/(chat)/(actions)/transfer-chat-modal";
import ChatProvider from "../(main)/(chat)/chat-context";
import ChatHeader from "../(main)/(chat)/chat-header";
import ChatMessagesList from "../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../(main)/(chat)/chat-send-message-area";
import ChatMessagesListMonitor from "../(main)/(chat)/chat-messages-list-monitor";
import FinishChatModal from "../(main)/(chat)/(actions)/finish-chat-modal";
import { Pagination } from "@mui/material";
import getMonitorItemProps from "./(functions)/get-monitor-item-props";

export default function MonitorPage() {
  const { chats } = useMonitorContext();
  const { sectors } = useWhatsappContext();
  const { users } = useInternalChatContext();
  const { getChatsMonitor, setCurrentChat, openChat } = useWhatsappContext();
  const { openInternalChat, setCurrentChat: setCurrentInternalChat } =
    useContext(InternalChatContext);

  const { openModal, closeModal } = useContext(AppContext);

  function getHandleTransfer(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
    if (!("startedAt" in chat)) {
      return null;
    }

    if ("startedAt" in chat && "contact" in chat) {
      return () => {
        setCurrentChat(chat);
        openModal(<TransferChatModal />);
      };
    }

    return null;
  }

  function getHandleView(chat: DetailedInternalChat | DetailedChat | DetailedSchedule) {
    if (!("startedAt" in chat)) {
      return null;
    }

    if ("startedAt" in chat && "contact" in chat) {
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
                <ChatSendMessageArea />
              </div>
            </ChatProvider>
          </div>,
        );
      };
    }
    if ("creatorId" in chat) {
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
    if (!("startedAt" in chat)) {
      return null;
    }

    if ("startedAt" in chat && "contact" in chat) {
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
        <main className="scrollbar-whatsapp grid grow grid-rows-[1fr_max-content] gap-4">
          <ul className="overflow-auto">
            {paginatedChats.map((chat) => {
              const props = getMonitorItemProps({ chat, users, sectors });
              return (
                <MonitorCard
                  key={`${props.type}-${chat.id}`}
                  {...props}
                  handleTransfer={getHandleTransfer(chat)}
                  handleView={getHandleView(chat)}
                  handleFinish={getHandleFinish(chat)}
                />
              );
            })}
          </ul>
          {chats.length === 0 && (
            <div className="mt-8 text-center text-gray-500">Nenhum chat encontrado.</div>
          )}
          <div className="mt-4 flex justify-center">
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
