"use client";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import { useContext } from "react";
import ChatProvider from "./(chat)/chat-context";
import { WhatsappContext } from "../whatsapp-context";
import { AuthContext } from "@/app/auth-context";

export default function Home() {
  const { currentChat } = useContext(WhatsappContext);
  const { user, instance } = useContext(AuthContext);

  return (
    <ChatProvider>
      <div className="box-border grid grid-cols-[24rem_1fr] grid-rows-1 gap-4 px-4 py-4">
        <ChatsMenu />
        {currentChat?.chatType === "internal" && (
          <Chat
            name={
              currentChat.groupName ||
              currentChat.users.find((u) => u.CODIGO !== user?.CODIGO)?.NOME ||
              user?.NOME ||
              "Grupo excluído"
            }
            phone="N/D"
            avatarUrl=""
            customerName={instance[0].toUpperCase() + instance.slice(1)}
            chatType={"internal"}
          />
        )}
        {currentChat?.chatType === "wpp" && (
          <Chat
            name={currentChat.contact?.name || "Contao excluído"}
            phone={currentChat?.contact?.phone || "N/D"}
            avatarUrl={currentChat.avatarUrl}
            customerName={currentChat?.customer?.RAZAO || "N/D"}
            chatType={currentChat?.chatType}
          />
        )}
      </div>
    </ChatProvider>
  );
}
