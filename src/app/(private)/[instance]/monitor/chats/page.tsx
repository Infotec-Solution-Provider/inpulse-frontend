"use client";
import { useContext, useEffect } from "react";
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AssignmentTurnedIn, SyncAlt } from "@mui/icons-material";
import { useWhatsappContext } from "../../whatsapp-context";
import FinishChatModal from "../../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../../(main)/(chat)/(actions)/transfer-chat-modal";
import { AppContext } from "../../app-context";
import ChatHeader from "../../(main)/(chat)/chat-header";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";

export default function MonitorAttendances() {
  const { getChatsMonitor, monitorChats,setCurrentChat, openChat,chats } = useWhatsappContext();

  const { openModal,closeModal } = useContext(AppContext);

  const openFinishChatModal = () => {
    openModal(<FinishChatModal />);
  };

  const openTransferChatModal = () => {
    openModal(<TransferChatModal />);
  };
  function openChatById(chat: any) {
    const foundChat = chats.find((c) => c.id === chat.id);
    if (foundChat) {
      setCurrentChat(foundChat);
      openChat(foundChat);

      openModal(
        <div className="relative flex h-[80vh] w-[500px] flex-col rounded-md bg-slate-900 shadow-xl">
          <button
            onClick={() => closeModal?.()}
            className="absolute right-2 top-2 z-10 text-white hover:text-red-400"
          >
            ✕
          </button>

          <div className="shrink-0 border-b border-slate-700">
            <ChatHeader
              avatarUrl={foundChat.avatarUrl}
              name={foundChat.contact?.name || "Contao excluído"}
              customerName={foundChat?.customer?.RAZAO || "N/D"}
              phone={foundChat?.contact?.phone || "N/D"}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <ChatMessagesList />
          </div>

          <div className="shrink-0 border-t border-slate-700">
            <ChatSendMessageArea />
          </div>
        </div>
      );
    }
  }


  useEffect(() => {
    getChatsMonitor();
  }, [getChatsMonitor]);

  return (
    <div>
      <table className="mx-auto mt-8">
        <thead>
          <tr className="bg-indigo-700 text-white">
            <th className="w-44 px-4 py-2">Ações</th>
            <th className="w-16 px-4 py-2">Código</th>
            <th className="w-32 px-4 py-2">Código ERP</th>
            <th className="px-4 py-2">Razão</th>
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">WhatsApp</th>
            <th className="px-4 py-2">Setor</th>
            <th className="px-4 py-2">Atendente</th>
            <th className="px-4 py-2">Data Início</th>
            <th className="px-4 py-2">Data Fim</th>
            <th className="px-4 py-2">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {monitorChats.map((chat, index) => (
            <tr key={index} className="even:bg-indigo-200/5">
              <td className="w-44 px-4 py-2">
                <div>
                  <IconButton onClick={() => openChatById(chat)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton onClick={openTransferChatModal}>
                    <SyncAlt color="secondary" />
                  </IconButton>
                  <IconButton onClick={openFinishChatModal}>
                    <AssignmentTurnedIn color="success" />
                  </IconButton>
                </div>
              </td>
              <td className="w-24 px-4 py-2">{chat.id}</td>
              <td className="w-32 px-4 py-2">{chat.erpCode}</td>
              <td className="px-4 py-2">{chat.companyName}</td>
              <td className="px-4 py-2">{chat.contactName}</td>
              <td className="px-4 py-2">{chat.whatsappNumber}</td>
              <td className="px-4 py-2">{chat.sectorName}</td>
              <td className="px-4 py-2">{chat.attendantName}</td>
              <td className="px-4 py-2">{chat.startDate}</td>
              <td className="px-4 py-2">{chat.endDate}</td>
              <td className="px-4 py-2">{chat.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
