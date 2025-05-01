"use client";
import { useContext, useEffect } from "react";
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AssignmentTurnedIn, SyncAlt } from "@mui/icons-material";
import { useWhatsappContext } from "../../whatsapp-context";
import { InternalChatContext } from "../../internal-context";
import { AppContext } from "../../app-context";
import ChatHeader from "../../(main)/(chat)/chat-header";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";
import FinishChatModal from "../../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../../(main)/(chat)/(actions)/transfer-chat-modal";

export default function UnifiedMonitorAttendances() {
  const {
    getChatsMonitor,
    monitorChats,
    setCurrentChat,
    openChat,
    chats,
  } = useWhatsappContext();

  const {
    internalChats,
    openInternalChat,
    setCurrentChat: setCurrentInternalChat,
  } = useContext(InternalChatContext);

  const { openModal, closeModal } = useContext(AppContext);

  useEffect(() => {
    getChatsMonitor();
  }, [getChatsMonitor]);

  const openFinishChatModal = () => openModal(<FinishChatModal />);
  const openTransferChatModal = () => openModal(<TransferChatModal />);

  const openChatModal = (content: React.ReactNode) =>
    openModal(
      <div className="relative flex h-[80vh] w-[500px] flex-col rounded-md bg-slate-900 shadow-xl">
        <button
          onClick={() => closeModal?.()}
          className="absolute right-2 top-2 z-10 text-white hover:text-red-400"
        >
          ✕
        </button>
        {content}
      </div>
    );

  const openWhatsappChat = (chat: any) => {
    const found = chats.find((c) => c.id === chat.id);
    if (found) {
      setCurrentChat(found);
      openChat(found);
      openChatModal(
        <>
          <div className="shrink-0 border-b border-slate-700">
            <ChatHeader
              avatarUrl={found.avatarUrl}
              name={found.contact?.name || "Contato excluído"}
              customerName={found.customer?.RAZAO || "N/D"}
              phone={found.contact?.phone || "N/D"}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatMessagesList />
          </div>
          <div className="shrink-0 border-t border-slate-700">
            <ChatSendMessageArea />
          </div>
        </>
      );
    }
  };

  const openInternalChatById = (chat: any) => {
    const found = internalChats.find((c) => c.id === chat.id);
    if (found) {
      setCurrentInternalChat(found);
      openInternalChat(found);
      openChatModal(
        <>
          <div className="shrink-0 border-b border-slate-700">
            <ChatHeader
              avatarUrl={""}
              name={found.users[0].NOME}
              customerName={found.users[0].NOME_EXIBICAO || ""}
              phone={found.users[0].SETOR_NOME || ""}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatMessagesList />
          </div>
          <div className="shrink-0 border-t border-slate-700">
            <ChatSendMessageArea />
          </div>
        </>
      );
    }
  };

  return (
    <div className="p-4 flex justify-center">
      <div className="overflow-auto max-h-[600px] w-full max-w-7xl rounded">
        <table className="min-w-full border-collapse table-fixed border-0">
          <thead className="sticky top-0 bg-indigo-700 text-white z-10">
            <tr>
              <th className="px-4 py-2 w-[130px] text-center">Ações</th>
              <th className="px-4 py-2 text-center">Código</th>
              <th className="px-4 py-2 text-center">Origem</th>
              <th className="px-4 py-2 text-center">Participantes / Cliente</th>
              <th className="px-4 py-2 text-center">Data Início</th>
              <th className="px-4 py-2 text-center">Data Fim</th>
              <th className="px-4 py-2 text-center">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {[...monitorChats, ...internalChats].map((chat: any, index) => {
              const isInternal = !!chat.users;

              return (
                <tr key={index} className="even:bg-indigo-200/5">
                  <td className="px-4 py-2 text-center">
                    <IconButton
                      size="small"
                      onClick={() =>
                        isInternal
                          ? openInternalChatById(chat)
                          : openWhatsappChat(chat)
                      }
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    {!isInternal && (
                      <>
                        <IconButton onClick={openTransferChatModal}>
                          <SyncAlt color="secondary" fontSize="small" />
                        </IconButton>
                        <IconButton onClick={openFinishChatModal}>
                          <AssignmentTurnedIn color="success" fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">{chat.id}</td>
                  <td className="px-4 py-2 text-center">
                    {isInternal ? "Interno" : "WhatsApp"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isInternal
                      ? chat.users.map((u) => u.NOME).join(", ")
                      : chat.contactName || chat.customer?.RAZAO}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {new Date(chat?.startDate || chat?.startedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {chat?.endDate || chat?.finishedAt
                      ? new Date(chat?.endDate || chat?.finishedAt).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="px-4 py-2 text-center">{chat?.result || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
