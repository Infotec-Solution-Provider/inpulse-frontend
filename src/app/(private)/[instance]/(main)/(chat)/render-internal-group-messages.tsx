"use client";

import React, { useState, useMemo, useContext, useEffect, useRef } from "react";
import { InternalMessage, User } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import GroupMessage from "./group-message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";
import { useAuthContext } from "@/app/auth-context";

function getInternalMessageStyle(msg: InternalMessage, userId: number) {
    if (msg.from === "system") return "system";
    if (msg.from === `user:${userId}`) return "sent";
    return "received";
}

interface RenderInternalGroupMessagesProps {
    selectedMessageIds: Set<string | number>;
    isSelectionMode: boolean;
    toggleSelectMessage: (id: string | number) => void;
    openManualForward: (msg: InternalMessage) => void;
}

const CANT_EDIT_MESSAGE_TYPES = ["audio", "sticker", "ptt"];

export default function RenderInternalGroupMessages({
    selectedMessageIds,
    isSelectionMode,
    toggleSelectMessage,
    openManualForward
}: RenderInternalGroupMessagesProps) {

    const { currentInternalChatMessages, users } = useContext(InternalChatContext);
    const { getMessageById, handleQuoteMessage, handleEditMessage } = useContext(ChatContext);
    const { user } = useAuthContext();
    const { contacts } = useContext(ContactsContext);

    const [visibleCount, setVisibleCount] = useState(30);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const usersMap = useMemo(() => {
        const map = new Map<number, User>();
        users.forEach(u => map.set(u.CODIGO, u));
        return map;
    }, [users]);

    const mentionNameMap = useMemo(() => {
        const map = new Map<string, string>();
        contacts.forEach(contact => {
            const phone = contact.phone?.replace(/\D/g, "");
            if (phone && contact.name) {
                map.set(phone, contact.name);
            }
        });
        users.forEach(u => {
            const phone = u.WHATSAPP?.replace(/\D/g, "");
            if (phone && u.NOME) {
                map.set(phone, u.NOME);
            }
        });
        return map;
    }, [users, contacts]);


    useEffect(() => {
        if (!isSelectionMode && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView();
        }
    }, [currentInternalChatMessages, isSelectionMode]);

    const visibleMessages = useMemo(() => currentInternalChatMessages.slice(-visibleCount), [currentInternalChatMessages, visibleCount]);

    const getSenderName = (message: InternalMessage): string => {
        if (message.from.startsWith("user:")) {
            const userId = Number(message.from.split(":")[1]);
            const findUser = usersMap.get(userId);
            return findUser ? findUser.NOME : "Usuário Desconhecido";
        }

        if (message.from.startsWith("external:")) {
            const parts = message.from.split(":");
            let raw = parts.length > 1 ? parts[parts.length - 1] : "";
            const phone = raw.split("@")[0].replace(/\D/g, "");
            return mentionNameMap.get(phone) || phone || "Contato Externo";
        }
        return "Sistema";
    };

    return (
        <div className="h-full w-full overflow-y-auto p-2 bg-slate-300 dark:bg-slate-900 scrollbar-whatsapp">
            {visibleCount < currentInternalChatMessages.length && (
                <div className="flex justify-center mb-2">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setVisibleCount(prev => Math.min(prev + 30, currentInternalChatMessages.length))}
                    >
                        Carregar mais
                    </Button>
                </div>
            )}

            <ul className="flex flex-col gap-2">
                {visibleMessages.map((m, i, arr) => {
                    const findQuoted = m.internalChatId && m.quotedId && (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);
                    const quotedMsg = findQuoted ? getQuotedMsgProps(findQuoted, getInternalMessageStyle(findQuoted, user!.CODIGO), users, null, mentionNameMap) : null;

                    const prev = i > 0 ? arr[i - 1] : null;
                    const groupFirst = !prev || prev.from !== m.from;
                    const senderName = getSenderName(m);

                    return (
                        <GroupMessage
                            key={m.id}
                            id={m.id}
                            style={getInternalMessageStyle(m, user!.CODIGO)}
                            groupFirst={groupFirst}
                            sentBy={senderName}
                            text={m.body}
                            type={m.type}
                            date={new Date(+m.timestamp)}
                            status={m.status}
                            fileId={m.fileId}
                            fileName={m.fileName}
                            fileType={m.fileType}
                            fileSize={m.fileSize}
                            quotedMessage={quotedMsg}
                            isForwarded={m.isForwarded}
                            onQuote={() => handleQuoteMessage(m)}
                            onCopy={() => navigator.clipboard.writeText(m.body)}
                            isForwardMode={isSelectionMode}
                            isSelected={selectedMessageIds.has(m.id)}
                            isEdited={m.isEdited}
                            onSelect={() => toggleSelectMessage(m.id)}
                            onForward={() => openManualForward(m)}
                            mentionNameMap={mentionNameMap}
                            onEdit={
                                m.from === `user:${user?.CODIGO}` && !CANT_EDIT_MESSAGE_TYPES.includes(m.type)
                                    ? () => handleEditMessage(m)
                                    : undefined
                            }
                        />
                    );
                })}
                <div ref={messagesEndRef} className="h-1" />
            </ul>
        </div>
    );
}
