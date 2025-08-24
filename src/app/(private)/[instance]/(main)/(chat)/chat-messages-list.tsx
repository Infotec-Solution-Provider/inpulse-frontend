"use client";

import React, { useState, useCallback, useMemo, useContext } from "react";
import { WhatsappContext, DetailedChat } from "../../whatsapp-context";
import { InternalChatContext, DetailedInternalChat } from "../../internal-context";
import RenderWhatsappChatMessages from "./render-whatsapp-chat-messages";
import RenderInternalChatMessages from "./render-internal-chat-messages";
import RenderInternalGroupMessages from "./render-internal-group-messages";
import { Button, Typography } from "@mui/material";
import ForwardMessagesModal, { ForwardableMessage, ForwardingTarget } from "./forward-messages/forward-messages-modal";


export default function ChatMessagesList() {
  const { currentChat, currentChatMessages, chats, forwardMessages } = useContext(WhatsappContext);
  const { users, internalChats, sendInternalMessage, currentInternalChatMessages } = useContext(InternalChatContext);

  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string | number>>(new Set());
  const [manualForwardMessages, setManualForwardMessages] = useState<ForwardableMessage[] | null>(null);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);

  const isWhatsappChat = currentChat?.chatType === "wpp";
  const isInternalChat = currentChat?.chatType === "internal" && !currentChat.isGroup;
  const isInternalGroup = currentChat?.chatType === "internal" && currentChat.isGroup;
  const isSelectionMode = selectedMessageIds.size > 0;

  const selectedMessages = useMemo((): ForwardableMessage[] => {
    const activeMessages = isWhatsappChat ? currentChatMessages : currentInternalChatMessages;
    return activeMessages.filter((m) => selectedMessageIds.has(m.id));
  }, [isWhatsappChat, currentChatMessages, currentInternalChatMessages, selectedMessageIds]);

  const messagesToForward = useMemo(() => manualForwardMessages || selectedMessages, [manualForwardMessages, selectedMessages]);

  const forwardingTargets = useMemo((): ForwardingTarget[] => {
    const wppTargets: ForwardingTarget[] = chats.map(chat => ({
      id: `wpp-${chat.id}`,
      type: 'wpp',
      name: chat.contact?.name || 'Desconhecido',
      secondaryText: chat.contact?.phone
    }));

    const userTargets: ForwardingTarget[] = users.map(user => ({
      id: `user-${user.CODIGO}`,
      type: 'user',
      name: user.NOME,
      secondaryText: 'Usuário Interno'
    }));

    const groupTargets: ForwardingTarget[] = internalChats
      .filter(chat => chat.isGroup)
      .map(groupChat => ({
        id: `group-${groupChat.id}`,
        type: 'group',
        name: groupChat.groupName || 'Grupo Interno',
        secondaryText: 'Grupo Interno'
      }));

    return [...wppTargets, ...userTargets, ...groupTargets];

  }, [chats, users, internalChats]);

  const toggleSelectMessage = useCallback((id: string | number) => { setSelectedMessageIds(prev => { const newSet = new Set(prev); newSet.has(id) ? newSet.delete(id) : newSet.add(id); return newSet; }); }, []);
  const clearSelection = () => setSelectedMessageIds(new Set());
  const openManualForward = (msg: ForwardableMessage) => { setManualForwardMessages([msg]); setForwardModalOpen(true); };

  const handleCloseForwardModal = () => {
    setForwardModalOpen(false);
    setManualForwardMessages(null);
    clearSelection();
  }

    const handleConfirmForward = async (selectedTargetIds: Set<string>) => {
        const msgs = messagesToForward;
        if (msgs.length === 0 || selectedTargetIds.size === 0) return;

        const whatsappTargets: { id: string, isGroup: boolean }[] = [];
        const internalTargets: { id: number }[] = [];
        const messageIds = msgs.map(m => Number(m.id));
        const sourceType = isWhatsappChat ? 'whatsapp' : 'internal';

        for (const targetId of selectedTargetIds) {
            const [type, idStr] = targetId.split(/-(.+)/);
            const id = Number(idStr);

            if (type === 'wpp') {
                const chat = chats.find(c => c.id === id);
                if (chat?.contact?.phone) whatsappTargets.push({ id: chat.contact.phone, isGroup: false });
            } else if (type === 'group' || type === 'internal') {

                internalTargets.push({ id });
            } else if (type === 'user') {
                const directChat = internalChats.find(c => !c.isGroup && c.participants.some(p => p.userId === id));
                if (directChat) internalTargets.push({ id: directChat.id });
            }
        }

        await forwardMessages({
            sourceType,
            messageIds,
            whatsappTargets,
            internalTargets,
        });

        handleCloseForwardModal();
    };

  return (
    <div className="h-full w-full flex flex-col">
      {isSelectionMode && (
        <div className="bg-white dark:bg-slate-900 shadow-lg p-2 flex items-center justify-between">
          <Typography variant="subtitle1" component="div" className="font-semibold">{selectedMessageIds.size} mensagem(s) selecionada(s)</Typography>
          <div className="flex gap-2">
            <Button variant="outlined" onClick={clearSelection}>Cancelar</Button>
            <Button variant="contained" onClick={() => setForwardModalOpen(true)}>Encaminhar</Button>
          </div>
        </div>
      )}
      <div className="flex-grow h-0">
        {isWhatsappChat && (
          <RenderWhatsappChatMessages
            selectedMessageIds={selectedMessageIds}
            isSelectionMode={isSelectionMode}
            toggleSelectMessage={toggleSelectMessage}
            openManualForward={openManualForward}
          />
        )}
        {isInternalChat && (
          <RenderInternalChatMessages
            selectedMessageIds={selectedMessageIds}
            isSelectionMode={isSelectionMode}
            toggleSelectMessage={toggleSelectMessage}
            openManualForward={openManualForward}
          />
        )}
        {isInternalGroup && (
          <RenderInternalGroupMessages
          selectedMessageIds={selectedMessageIds}
            isSelectionMode={isSelectionMode}
            toggleSelectMessage={toggleSelectMessage}
            openManualForward={openManualForward}
          />
        )}
      </div>

      <ForwardMessagesModal
        open={forwardModalOpen}
        onClose={handleCloseForwardModal}
        targets={forwardingTargets}
        onConfirm={handleConfirmForward}
      />
    </div>
  );
}
