"use client";
import { useContext, useEffect, useState, useMemo } from "react";
import {
  IconButton,
  TextField,
  MenuItem,
  TableHead,
  TableContainer,
  Table,
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
import { UsersContext } from "../../(cruds)/users/users-context";

export default function MonitorAttendances() {
  const {
    getChatsMonitor,
    monitorChats,
    setCurrentChat,
    openChat,
    chats,
    getChats,
  } = useWhatsappContext();

  const { openModal, closeModal } = useContext(AppContext);
  const { users,loadUsers } = useContext(UsersContext);

  const [fCode, setFCode] = useState("");
  const [fOrigin, setFOrigin] = useState("");
  const [fPart, setFPart] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fResult, setFResult] = useState("");

  useEffect(() => {
    getChats();
    console.log("monitorChat userss", users);
    getChatsMonitor();
    loadUsers();
  }, [getChats, getChatsMonitor,loadUsers]);

  const monitorChatsMemo = useMemo(() => [...monitorChats], [
    monitorChats,
  ]);
  const filtered = useMemo(() => {
    return monitorChatsMemo.filter((chat: any) => {
      const isInternal = !!chat.users;
      if (fCode && !String(chat.id).includes(fCode)) return false;
      const part = isInternal
        ? chat.users.map((u: any) => u.NOME).join(", ")
        : chat.contactName || chat.customer?.RAZAO || "";
      if (fPart && !part.toLowerCase().includes(fPart.toLowerCase())) return false;
      const start = new Date(chat.startDate || chat.startedAt).toLocaleDateString();
      if (fStart && !start.includes(fStart)) return false;
      const end = chat.endDate || chat.finishedAt
        ? new Date(chat.endDate || chat.finishedAt).toLocaleDateString()
        : "";
      if (fEnd && !end.includes(fEnd)) return false;
      const res = chat.result || "";
      if (fResult && !res.toLowerCase().includes(fResult.toLowerCase()))
        return false;
      return true;
    });
  }, [monitorChatsMemo, fCode, fOrigin, fPart, fStart, fEnd, fResult]);

  const openWhatsappChat = (chat: any) => {

    if (!chat) return;
    setCurrentChat(chat);
    openChat(chat);
    openModal(
      <div className="relative flex h-[80vh] w-[500px] flex-col rounded-md bg-slate-900 shadow-xl">
        <button
          onClick={() => closeModal?.()}
          className="absolute right-2 top-1 z-10 text-white hover:text-red-400"
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
          <div className="flex-1 overflow-y-auto">
            <ChatMessagesList />
          </div>
          <ChatSendMessageArea />
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

    <div className="mx-auto box-border grid grid-cols-[85rem] gap-y-8 px-4 py-8">

      <TableContainer className="mx-auto max-h-[75vh] overflow-auto rounded-md bg-indigo-700 bg-opacity-5 shadow-md">
        <Table className="max-h-[100%] overflow-auto">
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
                  value={fCode}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFPart(e.target.value)}
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
                  value={fPart}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFPart(e.target.value)}
                  placeholder="Número"
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
                placeholder="Contato"
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
                  placeholder="Razão Social"
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
          <tbody>
            {filtered.map((chat: any, idx) => {
              console.log("chat", chat);
              return (
                <tr key={idx} className="even:bg-indigo-200/5">
                  <td className="px-4 py-2 text-center">
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
                  </td>
                  <StyledTableCell className="px-2 py-3">
                    {chat.id}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat.customer?.CODIGOERP}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                  { chat.customer?.RAZAO || chat.contactName }
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
                    {users.find((user: any) => user.CODIGO === chat?.useId)?.NOME}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {new Date(chat?.startAt || chat?.startedAt).toLocaleDateString()}
                  </StyledTableCell>

                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
}
