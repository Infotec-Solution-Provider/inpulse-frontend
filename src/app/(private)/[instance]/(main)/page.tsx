"use client";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import React, { useContext } from "react";
import { WhatsappContext } from "../whatsapp-context";
import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import { TelephonyPanelSlot } from "@/lib/telephony/telephony-panel";
import { UiIcon } from "@/lib/ui-system/icons";
import "./attendance.css";

export default function Home() {
  const { currentChat, setCurrentChat } = useContext(WhatsappContext);
  const { user, instance } = useContext(AuthContext);

  // Handle browser/hardware back to close chat on mobile
  React.useEffect(() => {
    if (currentChat) {
      window.history.pushState({ chatOpen: true }, "");

      const handlePopState = () => {
        setCurrentChat(null);
      };

      window.addEventListener("popstate", handlePopState);

      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [currentChat, setCurrentChat]);

  const handleCloseChat = () => {
    setCurrentChat(null);
  };

  return (
    <section
      aria-label="Área de atendimento"
      className={`ip-attendance ${currentChat ? "chat-open" : ""}`}
    >
      <div className={`chats-menu min-h-0 ${currentChat ? "hidden" : "block"} md:block`}>
        <ChatsMenu />
      </div>
      <div
        className={`chat-panel-container min-h-0 min-w-0 overflow-hidden ${currentChat ? "flex" : "hidden"} h-full flex-col md:flex`}
      >
        {/* The mobile conversation hides the sidebar, so keep phone controls in flow here. */}
        {currentChat && (
          <TelephonyPanelSlot className="max-h-[40%] shrink-0 overflow-y-auto p-2 md:hidden" />
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
          {!currentChat && (
            <div className="ip-attendance-welcome">
              <span className="ip-attendance-welcome-icon">
                <UiIcon name="conversations" scale="empty" />
              </span>
              <h1>Seu próximo atendimento começa aqui</h1>
              <p>Selecione uma conversa para acompanhar o histórico e responder.</p>
            </div>
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
              startDate={
                currentChat.startedAt ? new Date(currentChat.startedAt).toDateString() : null
              }
              onClose={handleCloseChat}
            />
          )}
          {currentChat?.chatType === "wpp" && (
            <Chat
              name={currentChat.contact!.name || "Contato excluído"}
              phone={currentChat!.contact!.phone!}
              avatarUrl={currentChat.avatarUrl}
              customerName={currentChat?.customer?.RAZAO || null}
              chatType={currentChat?.chatType}
              codErp={currentChat?.customer?.COD_ERP || null}
              cpfCnpj={currentChat?.customer?.CPF_CNPJ || null}
              customerId={currentChat?.customer?.CODIGO || null}
              startDate={new Date(currentChat?.startedAt).toDateString() || null}
              onClose={handleCloseChat}
            />
          )}
        </div>
      </div>
    </section>
  );
}
