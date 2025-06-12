"use client";
import { useContext, useEffect, useState, useMemo } from "react";
import { IconButton, TextField } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AssignmentTurnedIn, SyncAlt } from "@mui/icons-material";
import { DetailedChat, useWhatsappContext } from "../../whatsapp-context";
import { AppContext } from "../../app-context";
import ChatProvider from "../../(main)/(chat)/chat-context";
import ChatHeader from "../../(main)/(chat)/chat-header";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";
import FinishChatModal from "../../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../../(main)/(chat)/(actions)/transfer-chat-modal";
import { InternalChatContext } from "../../internal-context";
import { Formatter } from "@in.pulse-crm/utils";
import { WppChat } from "@in.pulse-crm/sdk";
import toDateString from "@/lib/utils/date-string";

export default function MonitorAttendances() {
  const { getChatsMonitor, monitorChats, setCurrentChat, openChat, chats, getChats } =
    useWhatsappContext();

  const { users } = useContext(InternalChatContext);
  const { openModal, closeModal } = useContext(AppContext);
  const [fCode, setFCode] = useState("");
  const [fPart, setFPart] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fResult, setFResult] = useState("");
  const [fCodeERP, setFCodeERP] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fContactName, setFContactName] = useState("");
  const [fCustomerName, setFCustomerName] = useState("");
  const [fOperator, setFOperator] = useState("");

  useEffect(() => {
    getChats();
    getChatsMonitor();
  }, [getChats, getChatsMonitor]);

  const monitorChatsMemo = useMemo(() => [...monitorChats], [monitorChats]);
  const filtered = useMemo(() => {
    return monitorChatsMemo.filter((chat: any) => {
      if (fCode && !String(chat.id).includes(fCode)) return false;
      if (fCodeERP && !String(chat.customer?.CODIGOERP || "").includes(fCodeERP)) return false;

      const client = chat.customer?.RAZAO || chat.contactName || "";
      if (fPart && !client.toLowerCase().includes(fPart.toLowerCase())) return false;

      const phone = chat.contact?.phone || "";
      if (fPhone && !phone.includes(fPhone)) return false;

      const contactName = chat.contact?.name || "";
      if (fContactName && !contactName.toLowerCase().includes(fContactName.toLowerCase()))
        return false;

      const customerName = chat.customer?.RAZAO || "";
      if (fCustomerName && !customerName.toLowerCase().includes(fCustomerName.toLowerCase()))
        return false;

      const operator = chat?.user?.NOME || "";
      if (fOperator && !operator.toLowerCase().includes(fOperator.toLowerCase())) return false;

      const start = new Date(chat.startDate || chat.startedAt).toLocaleDateString();
      if (fStart && !start.includes(fStart)) return false;

      const end =
        chat.endDate || chat.finishedAt
          ? new Date(chat.endDate || chat.finishedAt).toLocaleDateString()
          : "";
      if (fEnd && !end.includes(fEnd)) return false;

      const res = chat.result || "";
      if (fResult && !res.toLowerCase().includes(fResult.toLowerCase())) return false;

      return true;
    });
  }, [
    monitorChatsMemo,
    fCode,
    fCodeERP,
    fPart,
    fPhone,
    fContactName,
    fCustomerName,
    fOperator,
    fStart,
    fEnd,
    fResult,
  ]);

  const openWhatsappChat = (chat: DetailedChat) => {
    if (!chat) return;
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

  const openTransferChatModal = (chat: DetailedChat) => {
    if (chat) {
      setCurrentChat(chat);
      openModal(<TransferChatModal />);
    }
  };

  const openFinishChatModal = (chat: DetailedChat) => {
    if (chat) {
      setCurrentChat(chat);
      openModal(<FinishChatModal />);
      getChatsMonitor();
    }
  };

  return (
    <div className="mx-auto box-border flex h-full w-full max-w-[1860px] flex-col overflow-auto rounded-md px-2 py-4 shadow-md">
      <header className="flex w-max items-center rounded-t-md bg-indigo-200 py-1 dark:bg-indigo-800">
        {/* Ações */}
        <div className="px-2 pl-6 md:w-24 lg:w-32">
          <h2 className="lg:text-md py-2 text-slate-800 dark:text-slate-200 md:text-sm">Ações</h2>
        </div>

        {/* Código */}
        <div className="pl-2 md:w-16 lg:w-20">
          <input
            value={fCode}
            onChange={(e) => setFCode(e.target.value)}
            placeholder="Código"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>

        {/* Código ERP */}
        <div className="pl-2 md:w-16 lg:w-20">
          <input
            value={fCodeERP}
            onChange={(e) => setFCodeERP(e.target.value)}
            placeholder="ERP"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>

        {/* Cliente/Razão */}
        <div className="pl-2 md:w-32 lg:w-44">
          <input
            value={fPart}
            onChange={(e) => setFPart(e.target.value)}
            placeholder="Cliente"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>

        {/* Contato/Nome */}
        <div className="pl-2 md:w-28 lg:w-36">
          <input
            value={fContactName}
            onChange={(e) => setFContactName(e.target.value)}
            placeholder="Contato"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>

        {/* Contato/Fone */}
        <div className="pl-2 md:w-32 lg:w-44">
          <input
            value={fPhone}
            onChange={(e) => setFPhone(e.target.value)}
            placeholder="Número"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>

        {/* Usuário */}
        <div className="pl-2 md:w-28 lg:w-36">
          <input
            value={fOperator}
            onChange={(e) => setFOperator(e.target.value)}
            placeholder="Usuário"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>

        {/* Data Início */}
        <div className="pl-2 md:w-28 lg:w-36">
          <input
            value={fStart}
            onChange={(e) => setFStart(e.target.value)}
            placeholder="Data Início"
            className="lg:text-md w-full bg-transparent p-2 text-slate-800 outline-none dark:text-slate-200 md:text-sm"
          />
        </div>
      </header>
      <div className="scrollbar-whatsapp w-max grow rounded-b-md bg-slate-200 dark:bg-slate-800">
        {filtered.map((chat: any, idx) => {
          return (
            <div
              key={idx}
              className="flex items-center py-2 text-slate-800 even:bg-indigo-700/10 dark:text-slate-200"
            >
              {/* Ações */}
              <div className="flex gap-1 pl-6 md:w-24 lg:w-32">
                <button onClick={() => openWhatsappChat(chat)} className="hover:brightness-125">
                  <VisibilityIcon color="info" className="md:scale-50 lg:scale-75" />
                </button>
                <button
                  onClick={() => openTransferChatModal(chat)}
                  className="hover:brightness-125"
                >
                  <SyncAlt color="secondary" className="md:scale-50 lg:scale-75" />
                </button>
                <button onClick={() => openFinishChatModal(chat)} className="hover:brightness-125">
                  <AssignmentTurnedIn color="success" className="md:scale-50 lg:scale-75" />
                </button>
              </div>

              {/* Código */}
              <div className="pl-2 md:w-16 lg:w-20">
                <p className="lg:text-md pl-2 font-semibold md:text-sm">{chat.id}</p>
              </div>

              {/* Código ERP */}
              <div className="pl-2 md:w-16 lg:w-20">
                <p className="lg:text-md pl-2 md:text-sm">{chat.customer?.CODIGOERP || "N/D"}</p>
              </div>

              {/* Cliente/Razão */}
              <div className="pl-2 md:w-32 lg:w-44">
                <p className="lg:text-md truncate pl-2 md:text-sm">
                  {chat.customer?.RAZAO || "N/D"}
                </p>
              </div>

              {/* Contato/Nome */}
              <div className="pl-2 md:w-28 lg:w-36">
                <p className="lg:text-md truncate pl-2 md:text-sm">{chat.contact?.name || "N/D"}</p>
              </div>

              {/* Contato/Fone */}
              <div className="pl-2 md:w-32 lg:w-44">
                <p className="lg:text-md truncate pl-2 md:text-sm">
                  {chat.contact?.phone ? Formatter.phone(chat.contact.phone) : "N/D"}
                </p>
              </div>

              {/* Usuário */}
              <div className="pl-2 md:w-28 lg:w-36">
                <p className="lg:text-md truncate pl-2 md:text-sm">
                  {chat.botId
                    ? "BOT"
                    : users.find((user: any) => String(user.CODIGO) === String(chat?.userId))?.NOME}
                </p>
              </div>

              {/* Data Início */}
              <div className="pl-2 md:w-28 lg:w-36">
                <p className="truncate pl-2 md:text-xs lg:text-sm">
                  {toDateString(chat?.startAt || chat?.startedAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
