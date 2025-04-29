"use client";
import { useContext, useEffect } from "react";
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AssignmentTurnedIn, SyncAlt } from "@mui/icons-material";
import { useWhatsappContext } from "../../whatsapp-context";
import FinishChatModal from "../../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../../(main)/(chat)/(actions)/transfer-chat-modal";
import { AppContext } from "../../app-context";
import { MonitorChat } from "@in.pulse-crm/sdk";

export default function MonitorAttendances() {
  const { getChatsMonitor,monitorChats, setCurrentChat, chats } = useWhatsappContext();

  const { openModal } = useContext(AppContext);

  const openFinishChatModal = (chat: MonitorChat) => {
    const foundChat = chats.find((c) => c.id === +chat.id);
    if (foundChat) {

      openModal(<FinishChatModal />);
    }
  };

  const openTransferChatModal = (chat: MonitorChat) => {
    const foundChat = chats.find((c) => c.id === +chat.id);
    if (foundChat) {
    openModal(<TransferChatModal />);
    }
  };

  useEffect(() => {
    getChatsMonitor()
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
                  <IconButton><VisibilityIcon /></IconButton>
                  <IconButton onClick={() => { openTransferChatModal(chat) }}><SyncAlt color="secondary" /></IconButton>
                  <IconButton onClick={() => { openFinishChatModal(chat) }}><AssignmentTurnedIn color="success" /></IconButton>
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



 