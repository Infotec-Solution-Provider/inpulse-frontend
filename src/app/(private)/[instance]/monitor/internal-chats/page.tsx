"use client";
import { useContext } from "react";
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AppContext } from "../../app-context";
import { InternalChatContext } from "../../internal-context";
import Chat from "../../(main)/(chat)/chat";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";
import ChatHeader from "../../(main)/(chat)/chat-header";

export default function InternalMonitorAttendances() {
  const { internalChats, openInternalChat,currentInternalChatMessages, setCurrentChat} = useContext(InternalChatContext);
  const { openModal,closeModal } = useContext(AppContext);

  function openInternalChatById(chat: any) {
    const foundChat = internalChats.find((c) => c.id === chat.id);
    if (foundChat) {
      setCurrentChat(foundChat);
      openInternalChat(foundChat);

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
              avatarUrl={''}
              name={foundChat.users[0].NOME}
              customerName={foundChat.users[0].NOME_EXIBICAO || ""}
              phone={foundChat.users[0].SETOR_NOME || ""}
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


  return (
    <div className="p-4 flex justify-center">
      <div className="overflow-auto max-h-[600px] w-full max-w-6xl rounded">
        <table className="min-w-full border-collapse table-fixed border-0">
          <thead className="sticky top-0 bg-indigo-700 text-white z-10">
            <tr>
              <th className="px-4 py-2 w-[130px] text-center">Ações</th>
              <th className="px-4 py-2 w-[100px] text-center">Código</th>
              <th className="px-4 py-2 w-[250px] text-center">Participantes</th>
              <th className="px-4 py-2 w-[180px] text-center">Data Início</th>
              <th className="px-4 py-2 w-[180px] text-center">Data Fim</th>
            </tr>
          </thead>
          <tbody>
            {internalChats.map((chat, index) => (
              <tr key={index} className="even:bg-indigo-200/5">
                <td className="px-4 py-2 text-center">
                  <IconButton size="small" onClick={() => openInternalChatById(chat)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </td>
                <td className="px-4 py-2 text-center">{chat.id}</td>
                <td className="px-4 py-2 text-center">
                  {chat.users.map((user, i) => (
                    <div key={i}>{user.NOME}</div>
                  ))}
                </td>
                <td className="px-4 py-2 text-center">
                  {chat?.startedAt ? new Date(chat.startedAt).toLocaleDateString() : ''}
                </td>
                <td className="px-4 py-2 text-center">
                  {chat?.finishedAt ? new Date(chat.finishedAt).toLocaleDateString() : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );




}

