"use client";

import React, { useState, useMemo, useContext, useCallback, useRef, useEffect } from "react";
import { InternalMessage, User } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import GroupMessage from "./group-message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";
import { ContactsContext } from "../../(cruds)/contacts/contacts-context";

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

export default function RenderInternalGroupMessages({
    selectedMessageIds,
    isSelectionMode,
    toggleSelectMessage,
    openManualForward
}: RenderInternalGroupMessagesProps) {

    const { currentInternalChatMessages, users } = useContext(InternalChatContext);
    const { getMessageById, handleQuoteMessage } = useContext(ChatContext);
    const { user } = useAuthContext();
    const { contacts } = useContext(ContactsContext);

    const [visibleCount, setVisibleCount] = useState(30);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const usersMap = useMemo(() => {
        const map = new Map<number, User>();
        users.forEach(u => map.set(u.CODIGO, u));
        return map;
    }, [users]);

    const contactsMap = useMemo(() => {
        const map = new Map<string, string>();
        contacts.forEach(contact => {
            const phone = contact.phone?.replace(/\D/g, "");
            if (phone) map.set(phone, contact.name);
        });
        return map;
    }, [contacts]);

    useEffect(() => {
        if (!isSelectionMode && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [currentInternalChatMessages, isSelectionMode]);

    const visibleMessages = useMemo(() => currentInternalChatMessages.slice(-visibleCount), [currentInternalChatMessages, visibleCount]);

    const getSenderName = (message: InternalMessage): string => {
        if (message.from.startsWith("user:")) {
            const userId = Number(message.from.split(":")[1]);
            const findUser = usersMap.get(userId);
            return findUser ? findUser.NOME : "Desconhecido";
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
                    const quotedMsg = findQuoted ? getQuotedMsgProps(findQuoted, getInternalMessageStyle(findQuoted, user!.CODIGO), users, null, contactsMap) : null;

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
                            date={new Date(+m.timestamp)}
                            status={m.status}
                            fileId={m.fileId}
                            fileName={m.fileName}
                            fileType={m.fileType}
                            fileSize={m.fileSize}
                            quotedMessage={quotedMsg}
                            onQuote={() => handleQuoteMessage(m)}
                            onCopy={() => navigator.clipboard.writeText(m.body)}
                            isForwardMode={isSelectionMode}
                            isSelected={selectedMessageIds.has(m.id)}
                            onSelect={() => toggleSelectMessage(m.id)}
                            onForward={() => openManualForward(m)}
                        />
                    );
                })}
                <div ref={messagesEndRef} className="h-1" />
            </ul>
        </div>
    );
}
