import ApiClient from "./api-client";
import { InternalChat, InternalChatMember, InternalGroup, InternalMessage, InternalSendMessageData } from "./types/internal.types";
export default class InternalChatClient extends ApiClient {
    createInternalChat(participants: number[], isGroup?: boolean, groupName?: string | null, groupId?: string | null, groupImage?: File | null): Promise<InternalChat>;
    deleteInternalChat(chatId: number): Promise<void>;
    getInternalChatsBySession(token?: string | null): Promise<{
        chats: (InternalChat & {
            participants: InternalChatMember[];
        })[];
        messages: InternalMessage[];
    }>;
    getInternalGroups(): Promise<InternalGroup[]>;
    sendMessageToInternalChat(data: InternalSendMessageData): Promise<void>;
    updateInternalGroup(groupId: number, data: {
        name: string;
        participants: number[];
        wppGroupId: string | null;
    }): Promise<InternalGroup>;
    updateInternalGroupImage(groupId: number, file: File): Promise<InternalGroup>;
    markChatMessagesAsRead(chatId: number): Promise<void>;
    getInternalChatsMonitor(): Promise<{
        chats: (InternalChat & {
            participants: InternalChatMember[];
        })[];
        messages: InternalMessage[];
    }>;
    setAuth(token: string): void;
}
