"use client";

import React, { useState, useMemo, useContext, useCallback, useRef, useEffect } from "react";
import { InternalMessage } from "@in.pulse-crm/sdk";
import { Button } from "@mui/material";
import getQuotedMsgProps from "./(utils)/getQuotedMsgProps";
import Message from "./message";
import { ChatContext } from "./chat-context";
import { InternalChatContext } from "../../internal-context";
import { useAuthContext } from "@/app/auth-context";

interface RenderInternalChatMessagesProps {
    selectedMessageIds: Set<string | number>;
    isSelectionMode: boolean;
    toggleSelectMessage: (id: string | number) => void;
    openManualForward: (msg: InternalMessage) => void;
}

export function getInternalMessageStyle(msg: InternalMessage, userId: number) {
    if (msg.from === "system") {
        return "system";
    }
    if (msg.from === `user:${userId}`) {
        return "sent";
    }
    return "received";
}

export default function RenderInternalChatMessages({
    selectedMessageIds,
    isSelectionMode,
    toggleSelectMessage,
    openManualForward
}: RenderInternalChatMessagesProps) {

    const { currentInternalChatMessages, users } = useContext(InternalChatContext);
    const { getMessageById, handleQuoteMessage } = useContext(ChatContext);
    const { user } = useAuthContext();

    const [visibleCount, setVisibleCount] = useState(30);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isSelectionMode && messagesEndRef.current) {
            const timer = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [currentInternalChatMessages, isSelectionMode]);

    const visibleMessages = useMemo(() => currentInternalChatMessages.slice(-visibleCount), [currentInternalChatMessages, visibleCount]);

    return (
        <div className="h-full w-full overflow-y-auto p-2 bg-slate-200 dark:bg-slate-800 scrollbar-whatsapp">

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
                {visibleMessages.map((m) => {
                    const findQuoted =
                        m.internalChatId &&
                        m.quotedId &&
                        (getMessageById(m.internalChatId, m.quotedId, true) as InternalMessage);

                    const quotedMsg = findQuoted
                        ? getQuotedMsgProps(findQuoted, getInternalMessageStyle(findQuoted, user!.CODIGO), users)
                        : null;

                    return (
                        <Message
                            id={m.id}
                            key={`message_${m.id}`}
                            style={getInternalMessageStyle(m, user!.CODIGO)}
                            text={m.body}
                            date={new Date(+m.timestamp)}
                            status={m.status}
                            fileId={m.fileId}
                            fileName={m.fileName}
                            fileType={m.fileType}
                            fileSize={m.fileSize}
                            quotedMessage={quotedMsg}
                            onQuote={() => handleQuoteMessage(m)}
                            isSelected={selectedMessageIds.has(m.id)}
                            onSelect={toggleSelectMessage}
                            onForward={() => openManualForward(m)}
                            onCopy={() => navigator.clipboard.writeText(m.body ?? '')}
                            isForwardMode={isSelectionMode}
                            isForwarded={m.isForwarded}
                        />
                    );
                })}
                <div ref={messagesEndRef} className="h-1" />
            </ul>
        </div>
    );
}
