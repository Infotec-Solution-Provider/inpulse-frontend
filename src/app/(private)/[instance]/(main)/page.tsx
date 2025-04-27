"use client";
import { Modal } from "@mui/material";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import { useContext } from "react";
import AppProvider, { AppContext } from "../app-context";
import ChatProvider from "./(chat)/chat-context";
import { WhatsappContext } from "../whatsapp-context";
import { InternalChatContext } from "../internal-context";

export default function Home() {
  const { currentChat: openedChat } = useContext(WhatsappContext);
  const { currentInternalChat: openedInternalChat } = useContext(InternalChatContext);
  const activeChat = openedChat || openedInternalChat;

  return (
    <ChatProvider>
      <div className="box-border grid grid-cols-[24rem_1fr] grid-rows-1 gap-4 px-4 py-4">
        <ChatsMenu />
        {activeChat ? (
          <Chat
            name={activeChat.contact?.name || "Contao excluído"}
            phone={activeChat?.contact?.phone || "N/D"}
            avatarUrl={activeChat.avatarUrl}
            customerName={openedChat?.customer?.RAZAO || "N/D"}
            chatType={activeChat?.chatType}

          />
        ) : (
          <div>Abra uma conversa</div>
        )}
      </div>
    </ChatProvider>
  );
}
