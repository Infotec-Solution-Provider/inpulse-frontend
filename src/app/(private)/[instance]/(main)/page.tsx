"use client";
import { Modal } from "@mui/material";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import { useContext } from "react";
import { AppContext } from "../app-context";
import ChatProvider from "./(chat)/chat-context";
import { WhatsappContext } from "../whatsapp-context";

export default function Home() {
  const { modal, closeModal } = useContext(AppContext);
  const { openedChat } = useContext(WhatsappContext);

  return (
    <ChatProvider>
      <div className="box-border grid grid-cols-[24rem_1fr] grid-rows-1 gap-4 px-4 py-4">
        <ChatsMenu />
        {openedChat ? (
          <Chat
            name={openedChat.contact?.name || "Contao excluído"}
            avatarUrl={openedChat.avatarUrl}
          />
        ) : (
          <div>Abra uma conversa</div>
        )}
        <Modal open={!!modal} onClose={closeModal} className="flex items-center justify-center">
          <>{modal}</>
        </Modal>
      </div>
    </ChatProvider>
  );
}
