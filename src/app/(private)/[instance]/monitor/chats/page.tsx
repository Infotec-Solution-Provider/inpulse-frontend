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
import { InternalChatContext } from "../../internal-context";
import { AppContext } from "../../app-context";
import ChatProvider from "../../(main)/(chat)/chat-context";
import ChatHeader from "../../(main)/(chat)/chat-header";
import ChatMessagesList from "../../(main)/(chat)/chat-messages-list";
import ChatSendMessageArea from "../../(main)/(chat)/chat-send-message-area";
import FinishChatModal from "../../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../../(main)/(chat)/(actions)/transfer-chat-modal";
import { StyledTableCell, StyledTableRow } from "./(table)/mui-style";
import ChatMessagesListMonitor from "../../(main)/(chat)/chat-messages-list-monitor";

export default function UnifiedMonitorAttendances() {
  const {
    getChatsMonitor,
    monitorChats,
    setCurrentChat,
    openChat,
    chats,
    getChats,
  } = useWhatsappContext();
  const {
    openInternalChat,
    getInternalChatsMonitor,
    monitorInternalChats,
    setCurrentChat: setCurrentInternalChat,
  } = useContext(InternalChatContext);
  const { openModal, closeModal } = useContext(AppContext);

  const [fCode, setFCode] = useState("");
  const [fOrigin, setFOrigin] = useState("");
  const [fPart, setFPart] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fResult, setFResult] = useState("");

  useEffect(() => {
    getChats();
    getChatsMonitor();
    getInternalChatsMonitor()

  }, [getChats, getChatsMonitor,getInternalChatsMonitor]);

  const combined = useMemo(() => [...monitorChats, ...monitorInternalChats], [
    monitorChats,
    monitorInternalChats,
  ]);
  const filtered = useMemo(() => {
    return combined.filter((chat: any) => {
      const isInternal = !!chat.users;
      if (fCode && !String(chat.id).includes(fCode)) return false;
      const origin = isInternal ? "interno" : "whatsapp";
      if (fOrigin && origin !== fOrigin) return false;
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
  }, [combined, fCode, fOrigin, fPart, fStart, fEnd, fResult]);

  const openWhatsappChat = (chat: any) => {
    const found = chats.find((c) => c.id == chat.id);
    if (!found) return;
    setCurrentChat(found);
    openChat(found);
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
            avatarUrl={found.avatarUrl}
            name={found.contact?.name || "Contato excluído"}
            customerName={found.customer?.RAZAO || "N/D"}
            phone={found.contact?.phone || "N/D"}
          />
          <div className="flex-1 overflow-y-auto">
            <ChatMessagesList />
          </div>
          <ChatSendMessageArea />
        </ChatProvider>
      </div>
    );
  };

  const openInternalChatById = (chat: any) => {
    if (!chat) return;
    setCurrentInternalChat(chat);
    openInternalChat(chat);
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
            avatarUrl={""}
            name={chat.groupName || chat.users[0].NOME}
            customerName={
              chat.groupDescription || chat.users[0].NOME_EXIBICAO || ""
            }
            phone={chat.users[0].SETOR_NOME || ""}
          />
          <div className="flex-1 overflow-y-auto">
            <ChatMessagesListMonitor />
          </div>
          <ChatSendMessageArea />
        </ChatProvider>
      </div>
    );
  };


const openTransferChatModal = (chat: any) => {
  const found = chats.find((c) => c.id == chat.id);
  if (found) {
    setCurrentChat(found);
    openModal(<TransferChatModal />);
  }
}

  const openFinishChatModal = (chat: any) => {
    const found = chats.find((c) => c.id == chat.id);
    if (found) {
      setCurrentChat(found);
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
                  name="Origem"
                  label="Origem"
                  variant="standard"
                  style={{ width: "7rem",marginTop: "-12px" }}
                  select
                  slotProps={{ input: { disableUnderline: true } }}
                  onChange={(e) => setFOrigin(e.target.value)}
                >
                  <MenuItem value="" key="none">Todos</MenuItem>
                  <MenuItem value="whatsapp" key="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="interno" key="interno">Interno</MenuItem>
                </TextField>
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fPart}
                  slotProps={{ input: { disableUnderline: true } }}

                  onChange={(e) => setFPart(e.target.value)}
                  placeholder="Participantes / Cliente"
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
              <StyledTableCell>
                <TextField
                  value={fEnd}
                  onChange={(e) => setFEnd(e.target.value)}
                  placeholder="Data Fim"
                  size="small"
                  variant="standard"
                  className="w-full"
                  slotProps={{ input: { disableUnderline: true } }}

                />
              </StyledTableCell>
              <StyledTableCell>
                <TextField
                  value={fResult}
                  onChange={(e) => setFResult(e.target.value)}
                  placeholder="Resultado"
                  size="small"
                  variant="standard"
                  slotProps={{ input: { disableUnderline: true } }}
                  className="w-full"
                />
              </StyledTableCell>
            </StyledTableRow>
          </TableHead>
          <tbody>
            {filtered.map((chat: any, idx) => {
              const isInternal = !!chat.users;
              return (
                <tr key={idx} className="even:bg-indigo-200/5">
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-1">
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
                          <IconButton onClick={() => openTransferChatModal(chat)}>
                            <SyncAlt color="secondary" fontSize="small" />
                          </IconButton>
                          <IconButton onClick={() => openFinishChatModal(chat)}>
                            <AssignmentTurnedIn color="success" fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </td>
                  <StyledTableCell className="px-2 py-3">
                    {chat.id}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {isInternal ? "Interno" : "WhatsApp"}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {isInternal
                      ? chat.users.map((u: any) => u.NOME).join(", ")
                      : chat.contactName || chat.customer?.RAZAO}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {new Date(chat?.startDate || chat?.startedAt).toLocaleDateString()}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat?.endDate || chat?.finishedAt
                      ? new Date(chat?.endDate || chat?.finishedAt).toLocaleDateString()
                      : ""}
                  </StyledTableCell>
                  <StyledTableCell className="px-2 py-3">
                    {chat?.result || ""}
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
