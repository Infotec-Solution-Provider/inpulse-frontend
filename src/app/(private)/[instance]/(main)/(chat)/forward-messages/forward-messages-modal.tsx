"use client";

import React, { useState, useMemo, useCallback, useContext } from "react";
import { WppMessage } from "@in.pulse-crm/sdk";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, Checkbox,
    ListItemButton, ListItemText, Typography, IconButton, TextField, Box
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { DetailedChat, WhatsappContext } from "../../../whatsapp-context";

interface ForwardMessagesModalProps {
    open: boolean;
    onClose: () => void;
    chats: DetailedChat[];
    messagesToForward: WppMessage[];
}

export default function ForwardMessagesModal({
    open,
    onClose,
    chats,
    messagesToForward
}: ForwardMessagesModalProps) {

    const { forwardMessages } = useContext(WhatsappContext);

    const [selectedChatsToForward, setSelectedChatsToForward] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const FORWARD_LIMIT = 5;

    const filteredChatsForModal = useMemo(() => {
        if (!searchQuery) return chats;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return chats.filter(chat =>
            chat.contact?.name?.toLowerCase().includes(lowerCaseQuery) ||
            chat.contact?.phone?.includes(lowerCaseQuery)
        );
    }, [chats, searchQuery]);

    const handleToggleChatSelection = useCallback((chatId: number) => {
        setSelectedChatsToForward(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chatId)) {
                newSet.delete(chatId);
            } else if (newSet.size < FORWARD_LIMIT) {
                newSet.add(chatId);
            } else {
                console.warn(`Limite de ${FORWARD_LIMIT} contatos atingido.`);
            }
            return newSet;
        });
    }, []);

    const handleConfirmForward = async () => {
        if (messagesToForward.length === 0 || selectedChatsToForward.size === 0) return;

        const messageIds = messagesToForward.map(msg => Number(msg.id));

        const whatsappTargets = Array.from(selectedChatsToForward).map(selectedChatId => {
            const chat = chats.find(c => c.id === selectedChatId);
            return {
                id: chat?.contact?.phone,
                isGroup: false
            };
        }).filter((target): target is { id: string; isGroup: boolean } => !!target.id);

        if (whatsappTargets.length === 0) return;

        await forwardMessages({
            messageIds,
            whatsappTargets,
        });

        onClose();
        setSelectedChatsToForward(new Set());
        setSearchQuery("");
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                Encaminhar para... ({selectedChatsToForward.size}/{FORWARD_LIMIT})
                <IconButton aria-label="fechar" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <Box px={3} pt={1} pb={1}>
                <TextField
                    fullWidth
                    autoFocus
                    variant="outlined"
                    size="small"
                    placeholder="Pesquisar por nome ou número..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </Box>
            <DialogContent dividers sx={{ p: 0 }}>
                <List sx={{ pt: 0 }}>
                    {filteredChatsForModal?.map((chat) => {
                        const isSelected = selectedChatsToForward.has(chat.id);
                        const isDisabled = !isSelected && selectedChatsToForward.size >= FORWARD_LIMIT;
                        return (
                            <ListItem key={chat.id} disablePadding>
                                <ListItemButton onClick={() => handleToggleChatSelection(chat.id)} disabled={isDisabled}>
                                    <ListItemText
                                        primary={chat.contact?.name}
                                        secondary={chat.contact?.phone}
                                    />
                                    <Checkbox
                                        edge="end"
                                        checked={isSelected}
                                        disabled={isDisabled}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleConfirmForward} variant="contained" disabled={selectedChatsToForward.size === 0}>
                    Encaminhar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
