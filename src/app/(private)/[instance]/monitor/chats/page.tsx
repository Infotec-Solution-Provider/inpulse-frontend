"use client";
import { useContext, useEffect, useState, useMemo } from "react";
import {
  IconButton,
  TextField,
  MenuItem,
  TableHead,
  TableContainer,
  Table,
  TableBody,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { AssignmentTurnedIn, SyncAlt } from "@mui/icons-material";
import { useWhatsappContext } from "../../whatsapp-context";
import { AppContext } from "../../app-context";
import ChatProvider from "../../(main)/(chat)/chat-context";
import ChatHeader from "../../(main)/(chat)/chat-header";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";
import FinishChatModal from "../../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../../(main)/(chat)/(actions)/transfer-chat-modal";
import { StyledTableCell, StyledTableRow } from "./(table)/mui-style";
import { InternalChatContext } from "../../internal-context";

export default function MonitorAttendances() {
  const {
    getChatsMonitor,
    monitorChats,
    setCurrentChat,
    openChat,
    chats,
    getChats,
  } = useWhatsappContext();
  const { users } = useContext(InternalChatContext);

  const { openModal, closeModal } = useContext(AppContext);
  const [fCode, setFCode] = useState("");
  const [fOrigin, setFOrigin] = useState("");
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

  const monitorChatsMemo = useMemo(() => [...monitorChats], [
    monitorChats,
  ]);
  const filtered = useMemo(() => {
    return monitorChatsMemo.filter((chat: any) => {
      const isInternal = !!chat.users;

      if (fCode && !String(chat.id).includes(fCode)) return false;
      if (fCodeERP && !String(chat.customer?.CODIGOERP || "").includes(fCodeERP)) return false;

      const client = chat.customer?.RAZAO || chat.contactName || "";
      if (fPart && !client.toLowerCase().includes(fPart.toLowerCase())) return false;

      const phone = chat.contact?.phone || "";
      if (fPhone && !phone.includes(fPhone)) return false;

      const contactName = chat.contact?.name || "";
      if (fContactName && !contactName.toLowerCase().includes(fContactName.toLowerCase())) return false;

      const customerName = chat.customer?.RAZAO || "";
      if (fCustomerName && !customerName.toLowerCase().includes(fCustomerName.toLowerCase())) return false;

      const operator = chat?.user?.NOME || "";
      if (fOperator && !operator.toLowerCase().includes(fOperator.toLowerCase())) return false;

      const start = new Date(chat.startDate || chat.startedAt).toLocaleDateString();
      if (fStart && !start.includes(fStart)) return false;

      const end = chat.endDate || chat.finishedAt
        ? new Date(chat.endDate || chat.finishedAt).toLocaleDateString()
        : "";
      if (fEnd && !end.includes(fEnd)) return false;

      const res = chat.result || "";
      if (fResult && !res.toLowerCase().includes(fResult.toLowerCase())) return false;

      return true;
    });
  }, [monitorChatsMemo, fCode, fCodeERP, fPart, fPhone, fContactName, fCustomerName, fOperator, fStart, fEnd, fResult]);

  const openWhatsappChat = (chat: any) => {

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
          <div className="flex-1 scrollbar-whatsapp bg-white text-black dark:bg-slate-900 dark:text-white drop-shadow-md">
            <ChatMessagesList />
          </div>
          <div className="bg-white text-black dark:bg-slate-900 p-2 border-t border-gray-200 dark:border-gray-700">
            <ChatSendMessageArea />

          </div>
        </ChatProvider>
      </div>
    );
  };


  const openTransferChatModal = (chat: any) => {
    if (chat) {
      setCurrentChat(chat);
      openModal(<TransferChatModal />);
    }
  }

  const openFinishChatModal = (chat: any) => {
    if (chat) {
      setCurrentChat(chat);
      openModal(<FinishChatModal />);
      getChatsMonitor();
    }
  };

  return (

    <div className="flex flex-col  px-10 pt-5 w-screen  h-screen box-border relative bg-white text-black dark:bg-gray-900 dark:text-white">

      <TableContainer className="mx-auto max-h-[75vh] overflow-auto scrollbar-whatsapp rounded-md bg-indigo-700 bg-opacity-5 shadow-md dark:bg-slate-900">
        <Table className="max-h-[80%] overflow-auto">
          <TableHead>
            <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900 z-50 ">
              <StyledTableCell className="px-2 py-2 text-center">Ações</StyledTableCell>

              <StyledTableCell>
                <TextField
                  value={fCode}
                  slotProps={{ input: { disableUnderline: true } }}
                  onChange={(e) => setFCode(e.target.value)}
                  placeholder="Código"
                  size="small"
                  variant="standard"
                  style={{ width: "5rem" }}

                />
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fCodeERP}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFCodeERP(e.target.value)}
                  placeholder="Código ERP"
                  size="small"
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fPart}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFPart(e.target.value)}
                  placeholder="Cliente"
                  size="small"
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fPhone}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFPhone(e.target.value)}
                  placeholder="Número"
                  size="small"
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fContactName}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFContactName(e.target.value)}
                  placeholder="Contato"
                  size="small"
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>

              <StyledTableCell>
                <TextField
                  value={fCustomerName}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFCustomerName(e.target.value)}
                  placeholder="Razão Social"
                  size="small"
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>

              <StyledTableCell>
                <TextField
                  value={fOperator}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFOperator(e.target.value)}
                  placeholder="Operador"
                  size="small"
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fStart}
                  onChange={(e) => setFStart(e.target.value)}
                  placeholder="Data Início"
                  size="small"
                  slotProps={{ input: { disableUnderline: true } }}
                  variant="standard"
                  className="w-full"
                />
              </StyledTableCell>
            </StyledTableRow>
          </TableHead>
          <TableBody>
            {filtered.map((chat: any, idx) => {
              return (
                <StyledTableRow key={idx} >
                  <StyledTableCell className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-1">
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
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.id}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.customer?.CODIGOERP}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.customer?.RAZAO || chat.contactName}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.contact.phone}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.contact.name}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.customer?.RAZAO}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {users.find((user: any) => String(user.CODIGO) === String(chat?.userId))?.NOME}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {new Date(chat?.startAt || chat?.startedAt).toLocaleDateString()}
                  </StyledTableCell>

                </StyledTableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
