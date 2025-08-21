"use client";

import React, { useState, useCallback, useMemo, useContext } from "react";
import { WppMessage } from "@in.pulse-crm/sdk";
import { WhatsappContext } from "../../whatsapp-context";
import { InternalChatContext } from "../../internal-context";
import RenderWhatsappChatMessages from "./render-whatsapp-chat-messages";
import RenderInternalChatMessages from "./render-internal-chat-messages";
import RenderInternalGroupMessages from "./render-internal-group-messages";
import { Button, Typography } from "@mui/material";
import ForwardMessagesModal from "./forward-messages/forward-messages-modal";

export default function ChatMessagesList() {
    const { currentChat, currentChatMessages, chats } = useContext(WhatsappContext);
    const { currentInternalChatMessages } = useContext(InternalChatContext);

    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string | number>>(new Set());
    const [manualForwardMessages, setManualForwardMessages] = useState<WppMessage[] | null>(null);

    const [forwardModalOpen, setForwardModalOpen] = useState(false);

    const isSelectionMode = selectedMessageIds.size > 0;

    const selectedMessages = useMemo(() => {
        return currentChatMessages.filter((m) => selectedMessageIds.has(m.id));
    }, [currentChatMessages, selectedMessageIds]);

    const messagesToForward = useMemo(() => manualForwardMessages || selectedMessages, [manualForwardMessages, selectedMessages]);

    const toggleSelectMessage = useCallback((id: string | number) => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    }, []);

    const clearSelection = () => setSelectedMessageIds(new Set());

    const openManualForward = (msg: WppMessage) => {
        setManualForwardMessages([msg]);
        setForwardModalOpen(true);
    };

    const handleCloseForwardModal = () => {
        setForwardModalOpen(false);
        setManualForwardMessages(null);
        clearSelection();
    }

    const isWhatsappChat = currentChat?.chatType === "wpp";
    const isInternalChat = currentChat?.chatType === "internal" && !currentChat.isGroup;
    const isInternalGroup = currentChat?.chatType === "internal" && currentChat.isGroup;

    return (
        <div className="h-full w-full flex flex-col">
            {isSelectionMode && (
                <div className="bg-white dark:bg-slate-900 shadow-lg p-2 flex items-center justify-between">
                    <Typography variant="subtitle1" component="div" className="font-semibold">
                        {selectedMessageIds.size} mensagem(s) selecionada(s)
                    </Typography>
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
                {isInternalChat && <RenderInternalChatMessages />}
                {isInternalGroup && <RenderInternalGroupMessages />}
            </div>

            <ForwardMessagesModal
                open={forwardModalOpen}
                onClose={handleCloseForwardModal}
                chats={chats}
                messagesToForward={messagesToForward}
            />
        </div>
    );
}
