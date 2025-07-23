"use client";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import React, { useContext } from "react";
import ChatProvider from "./(chat)/chat-context";
import { WhatsappContext } from "../whatsapp-context";
import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";

export default function Home() {
  const { currentChat, setCurrentChat } = useContext(WhatsappContext);
  const { user, instance } = useContext(AuthContext);

  // Handle browser/hardware back to close chat on mobile
  React.useEffect(() => {
    if (currentChat) {
      console.log("currentChat", currentChat);

      window.history.pushState({ chatOpen: true }, "");
      const handlePopState = () => {
        setCurrentChat(null);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [currentChat, setCurrentChat]);

  return (
    <ChatProvider>
      <div className={`md:p-2 box-border h-auto md:h-full w-full overflow-auto md:overflow-hidden grid grid-rows-1 md:gap-2 ${currentChat ? 'chat-open' : ''} grid-cols-1 md:grid-cols-[24rem_1fr]`}>
        <div className={`chats-menu ${currentChat ? 'hidden' : 'block'} md:block`}> <ChatsMenu /> </div>
        <div className="chat-panel-container w-full h-full flex flex-col overflow-hidden flex-1">
          {/* mobile back handled by hardware/browser history */}
          {false && (
            <button
              onClick={() => setCurrentChat(null)}
              className="md:hidden flex items-center gap-1 text-blue-600 mb-2"
            >
              ← Voltar
            </button>
          )}
          {currentChat?.chatType === "internal" && (
            <Chat
              name={
                currentChat.groupName ||
                currentChat.users.find((u) => u.CODIGO !== user?.CODIGO)?.NOME ||
                user?.NOME ||
                "Grupo excluído"
              }
              phone={null}
              avatarUrl={(() => {
                let avatar: string | undefined = undefined;

                if (currentChat.isGroup && currentChat.groupImageFileId) {
                  avatar = filesService.getFileDownloadUrl(currentChat.groupImageFileId);
                }

                if (!currentChat.isGroup) {
                  const otherUser = currentChat.users.find((u) => u.CODIGO !== user?.CODIGO);
                  const avatarUrl =
                    otherUser?.AVATAR_ID && filesService.getFileDownloadUrl(otherUser.AVATAR_ID);
                  avatar = avatarUrl || undefined;
                }

                return avatar;
              })()}
              customerName={instance[0].toUpperCase() + instance.slice(1)}
              chatType={"internal"}
              codErp={null}
              cpfCnpj={null}
              customerId={null}
              startDate={currentChat.startedAt ? new Date(currentChat.startedAt).toDateString() : null}
            />
          )}
          {currentChat?.chatType === "wpp" && (
            <Chat
              name={currentChat.contact!.name || "Contao excluído"}
              phone={currentChat!.contact!.phone!}
              avatarUrl={currentChat.avatarUrl}
              customerName={currentChat?.customer?.RAZAO || null}
              chatType={currentChat?.chatType}
              codErp={currentChat?.customer?.COD_ERP || null}
              cpfCnpj={currentChat?.customer?.CPF_CNPJ || null}
              customerId={currentChat?.customer?.CODIGO || null}
              startDate={new Date(currentChat?.startedAt).toDateString() || null}
            />
          )}
        </div>
      </div>
    </ChatProvider>
  );
}
