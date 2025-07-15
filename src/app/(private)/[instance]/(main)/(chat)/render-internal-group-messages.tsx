"use client";

import React, { useState, useMemo, useContext, useCallback } from "react";
import { InternalMessage, User } from "@in.pulse-crm/sdk";
import GroupMessage from "./group-message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

export default function InternalGroupChatWithSelection() {
  const { currentInternalChatMessages, users, sendInternalMessage } = useContext(InternalChatContext);
  const { getMessageById, handleQuoteMessage } = useContext(ChatContext);
  const { user } = useAuthContext();
  const { contacts } = useContext(ContactsContext);

  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [manualForwardMessages, setManualForwardMessages] = useState<InternalMessage[] | null>(null);

  const usersMap = useMemo(() => {
    const map = new Map<number, User>();
    for (const u of users) {
      map.set(u.CODIGO, u);
    }
    return map;
  }, [users]);

  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contacts) {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone) map.set(phone, contact.name);
    }
    return map;
  }, [contacts]);

  const mentionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      const phone = u.WHATSAPP?.replace(/\D/g, "");
      if (phone) map.set(phone, u.NOME);
    }
    for (const c of contacts) {
      const phone = c.phone?.replace(/\D/g, "");
      if (phone && !map.has(phone)) map.set(phone, c.name);
    }
    return map;
  }, [users, contacts]);

  const toggleSelectMessage = useCallback((id: number) => {
    setSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = () => {
    setSelectedMessageIds(new Set());
  };

  const selectedMessages = useMemo(() => {
    return currentInternalChatMessages.filter((m) => selectedMessageIds.has(m.id));
  }, [currentInternalChatMessages, selectedMessageIds]);

  function getInternalMessageStyle(msg: InternalMessage, userId: number) {
    if (msg.from === "system") return "system";
    if (msg.from === `user:${userId}`) return "sent";
    return "received";
  }

  const handleForwardToUser = (targetUserId: number) => {
    const msgsToForward = manualForwardMessages || selectedMessages;
    for (const msg of msgsToForward) {
      sendInternalMessage({
        chatId: targetUserId,
        text: msg.body,
        fileId: msg.fileId ?? undefined,
        sendAsAudio: false,
        sendAsDocument: false,
        mentions: [],
        quotedId: null,
      });
    }
    setForwardModalOpen(false);
    setManualForwardMessages(null);
    clearSelection();
  };

  const openManualForward = (msg: InternalMessage) => {
    setManualForwardMessages([msg]);
    setForwardModalOpen(true);
  };

  return (
    <div className="relative h-full overflow-y-auto p-2">
      {selectedMessageIds.size > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 shadow p-2 flex items-center justify-between">
          <Typography variant="subtitle1" component="div">
            {selectedMessageIds.size} mensagem(s) selecionada(s)
          </Typography>
          <div className="flex gap-2">
            <Button variant="outlined" onClick={clearSelection}>Cancelar</Button>
            <Button variant="contained" onClick={() => setForwardModalOpen(true)}>
              Encaminhar
            </Button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2 pt-[48px]">
        {currentInternalChatMessages.map((m, i, arr) => {
          const findQuoted =
            m.internalChatId &&
            m.quotedId &&
            (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);

          const quotedMsg = findQuoted
            ? getQuotedMsgProps(
                findQuoted,
                getInternalMessageStyle(findQuoted, user!.CODIGO),
                users,
                null,
                contactsMap
              )
            : null;

          const prev = i > 0 ? arr[i - 1] : null;
          const groupFirst = !prev || prev.from !== m.from;
          let name: string | null = null;

          if (m.from.startsWith("user:")) {
            const userId = Number(m.from.split(":")[1]);
            const findUser = usersMap.get(userId);
            name = findUser ? findUser.NOME : null;
          }

          if (m.from.startsWith("external:")) {
            const parts = m.from.split(":");
            let raw = "";
            if (parts.length === 3) raw = parts[2];
            else if (parts.length === 2) raw = parts[1];
            const phone = raw.split("@")[0].replace(/\D/g, "");
            const findUser = usersMap.get(phone as unknown as number);
            if (findUser) {
              name = findUser.NOME;
            } else {
              const contactName = contactsMap.get(phone);
              if (contactName) name = contactName;
              else
                name = phone
                  ? phone.length <= 13
                    ? phone
                    : phone
                  : "Sem número";
            }
          }

          return (
            <GroupMessage
              key={m.id}
              id={m.id}
              style={getInternalMessageStyle(m, user!.CODIGO)}
              groupFirst={groupFirst}
              sentBy={name || "Desconhecido"}
              text={m.body}
              date={new Date(+m.timestamp)}
              status={m.status}
              fileId={m.fileId}
              fileName={m.fileName}
              fileType={m.fileType}
              fileSize={m.fileSize}
              quotedMessage={quotedMsg}
              onQuote={() => handleQuoteMessage(m)}
              mentionNameMap={mentionNameMap}
              isForwardMode={selectedMessageIds.size > 0}
              isSelected={selectedMessageIds.has(m.id)}
              onSelect={toggleSelectMessage}
              onForward={() => openManualForward(m)}
              onCopy={() => navigator.clipboard.writeText(m.body)}
            />
          );
        })}
      </ul>

      <Dialog open={forwardModalOpen} onClose={() => setForwardModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Encaminhar para...
          <IconButton
            aria-label="fechar"
            onClick={() => setForwardModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <List>
            {users.map((u) => (
              <ListItem key={u.CODIGO} disablePadding>
                <ListItemButton onClick={() => handleForwardToUser(u.CODIGO)}>
                  <ListItemText primary={u.NOME} secondary={u.EMAIL || u.WHATSAPP} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </div>
  );
}
