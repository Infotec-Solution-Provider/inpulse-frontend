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
    <div className="box-border h-full py-4 px-4">
      <div className="mx-auto flex h-full max-w-[1860px] flex-col rounded-md shadow-md">
        <header className="flex items-center rounded-t-md bg-indigo-200 py-2 dark:bg-indigo-800">
          <div className="w-[10rem] pl-8 pr-2">
            <h2 className="text-slate-800 dark:text-slate-200">Ações</h2>
          </div>
          <div className="w-[5rem] pl-2">
            <TextField
              value={fCode}
              slotProps={{ input: { disableUnderline: true } }}
              onChange={(e) => setFCode(e.target.value)}
              placeholder="Código"
              size="small"
              variant="standard"
              fullWidth
            />
          </div>
          <div className="w-[8rem] pl-2">
            <TextField
              value={fCodeERP}
              slotProps={{ input: { disableUnderline: true } }}
              onChange={(e) => setFCodeERP(e.target.value)}
              placeholder="Código ERP"
              size="small"
              variant="standard"
              className="w-full"
            />
          </div>
          <div className="w-[20rem] pl-2">
            <TextField
              value={fPart}
              slotProps={{ input: { disableUnderline: true } }}
              onChange={(e) => setFPart(e.target.value)}
              placeholder="Cliente"
              size="small"
              variant="standard"
              className="w-full"
            />
          </div>
          <div className="w-[11rem] pl-2">
            <TextField
              value={fContactName}
              slotProps={{ input: { disableUnderline: true } }}
              onChange={(e) => setFContactName(e.target.value)}
              placeholder="Contato"
              size="small"
              variant="standard"
              className="w-full"
            />
          </div>
          <div className="w-[11rem] pl-2">
            <TextField
              value={fPhone}
              slotProps={{ input: { disableUnderline: true } }}
              onChange={(e) => setFPhone(e.target.value)}
              placeholder="Número"
              size="small"
              variant="standard"
              className="w-full"
            />
          </div>
          <div className="w-[11rem] pl-2">
            <TextField
              value={fOperator}
              slotProps={{ input: { disableUnderline: true } }}
              onChange={(e) => setFOperator(e.target.value)}
              placeholder="Usuário"
              size="small"
              variant="standard"
              className="w-full"
            />
          </div>
          <div className="w-[11rem] pl-2">
            <TextField
              value={fStart}
              onChange={(e) => setFStart(e.target.value)}
              placeholder="Data Início"
              size="small"
              slotProps={{ input: { disableUnderline: true } }}
              variant="standard"
              className="w-full"
            />
          </div>
        </header>
        <div className="scrollbar-whatsapp grow overflow-auto rounded-b-md bg-slate-200 dark:bg-slate-800">
          {filtered.map((chat: any, idx) => {
            return (
              <div key={idx} className="flex items-center py-2 text-slate-800 dark:text-slate-200 even:bg-indigo-700/10">
                <div className="flex w-[10rem] items-center justify-center gap-2 pl-8 pr-2">
                  <IconButton size="small" onClick={() => openWhatsappChat(chat)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => openTransferChatModal(chat)}>
                    <SyncAlt color="secondary" fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => openFinishChatModal(chat)}>
                    <AssignmentTurnedIn color="success" fontSize="small" />
                  </IconButton>
                </div>
                <div className="w-[5rem] pl-2">
                  <p className="font-semibold">{chat.id}</p>
                </div>
                <div className="w-[8rem] pl-2">
                  <p>{chat.customer?.CODIGOERP || "N/D"}</p>
                </div>
                <div className="w-[20rem] pl-2">
                  <p className="truncate">{chat.customer?.RAZAO || "N/D"}</p>
                </div>
                <div className="w-[11rem] pl-2">
                  <p className="truncate">{chat.contact?.name || "N/D"}</p>
                </div>
                <div className="w-[11rem] pl-2">
                  <p className="truncate">
                    {chat.contact?.phone ? Formatter.phone(chat.contact.phone) : "N/D"}
                  </p>
                </div>
                <div className="w-[11rem] pl-2">
                  <p className="truncate">
                    {chat.botId
                      ? "BOT"
                      : users.find((user: any) => String(user.CODIGO) === String(chat?.userId))
                          ?.NOME}
                  </p>
                </div>
                <div className="w-[11rem] pl-2">
                  <p>{new Date(chat?.startAt || chat?.startedAt).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
