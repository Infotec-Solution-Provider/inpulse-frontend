"use client";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import React, { useContext } from "react";
import { WhatsappContext } from "../whatsapp-context";
import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import { TelephonyPanelSlot } from "@/lib/telephony/telephony-panel";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { UiIcon } from "@/lib/ui-system/icons";
import { useAttendanceView } from "./attendance-view";
import { useIntegratedCallHistory } from "./integrated-call-history";
import { IntegratedCustomer } from "./integrated-customer";
import IntegratedCallContact from "./integrated-call-contact";
import "./attendance.css";

export default function Home() {
  const { currentChat, setCurrentChat } = useContext(WhatsappContext);
  const { user, instance } = useContext(AuthContext);
  const phone = useTelephony();
  const [view, selectView] = useAttendanceView(instance, user?.CODIGO);
  const integrated = phone.enabled && view === "integrated";
  const [appointmentHost, setAppointmentHost] = React.useState<HTMLDivElement | null>(null);
  const [appointmentOpen, setAppointmentOpen] = React.useState(false);
  const [customerOpen, setCustomerOpen] = React.useState(true);
  const [historyVersion, refreshHistory] = React.useReducer((version: number) => version + 1, 0);
  const showAppointment = integrated && appointmentOpen;
  const showWorkspace = !!currentChat || showAppointment;
  const whatsappChat = currentChat?.chatType === "wpp" ? currentChat : null;
  const attendanceHistory = useIntegratedCallHistory(
    integrated && !!whatsappChat,
    whatsappChat?.customer?.CODIGO ?? null,
    `${historyVersion}:${phone.state.endedAt ?? ""}`,
  );

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
      className={`ip-attendance ${showWorkspace ? "chat-open" : ""}`}
      data-attendance-view={integrated ? "integrated" : "classic"}
      data-has-view-control={phone.enabled}
    >
      {phone.enabled && (
        <div className="attendance-layout-bar">
          <label className="attendance-layout-control">
            Visualização do atendimento
            <select
              value={view}
              onChange={(event) =>
                selectView(event.target.value === "integrated" ? "integrated" : "classic")
              }
            >
              <option value="classic">Clássico</option>
              <option value="integrated">Integrado</option>
            </select>
          </label>
          {integrated && (
            <>
              {whatsappChat && !showAppointment && (
                <button
                  type="button"
                  className="attendance-layout-button"
                  aria-expanded={customerOpen}
                  aria-controls="attendance-customer-summary"
                  onClick={() => setCustomerOpen((open) => !open)}
                >
                  Ficha do cliente
                </button>
              )}
              <TelephonyPanelSlot
                integrated
                className="attendance-integrated-phone"
                callContext={
                  <IntegratedCallContact
                    key={phone.state.callId ?? phone.state.number}
                    number={phone.state.number}
                  />
                }
              />
            </>
          )}
        </div>
      )}
      <div className={`chats-menu min-h-0 ${showWorkspace ? "hidden" : "block"} md:block`}>
        <ChatsMenu
          integrated={integrated}
          appointmentHost={appointmentHost}
          onAppointmentOpenChange={setAppointmentOpen}
          onAppointmentFinished={refreshHistory}
        />
      </div>
      <div
        className={`chat-panel-container min-h-0 min-w-0 overflow-hidden ${showWorkspace ? "flex" : "hidden"} h-full flex-col md:flex`}
      >
        {/* The mobile conversation hides the sidebar, so keep phone controls in flow here. */}
        {currentChat && !integrated && (
          <TelephonyPanelSlot className="max-h-[40%] shrink-0 overflow-y-auto p-2 md:hidden" />
        )}
        <div className="attendance-workspace" data-has-chat={!!currentChat}>
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${showAppointment && !currentChat ? "hidden md:block" : ""}`}
          >
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
                name={currentChat.contact?.name || "Contato excluído"}
                phone={currentChat.contact?.phone ?? null}
                avatarUrl={currentChat.avatarUrl}
                customerName={currentChat?.customer?.RAZAO || null}
                chatType={currentChat?.chatType}
                codErp={currentChat?.customer?.COD_ERP || null}
                cpfCnpj={currentChat?.customer?.CPF_CNPJ || null}
                customerId={currentChat?.customer?.CODIGO || null}
                startDate={new Date(currentChat?.startedAt).toDateString() || null}
                onClose={handleCloseChat}
                attendanceHistory={attendanceHistory}
              />
            )}
          </div>
          <aside
            className="attendance-integrated-details"
            aria-label="Dados do atendimento"
            hidden={!integrated || (!showAppointment && (!whatsappChat || !customerOpen))}
            data-appointment-open={showAppointment}
          >
            <div
              id="attendance-customer-summary"
              hidden={showAppointment || !whatsappChat || !customerOpen}
            >
              {integrated && whatsappChat && <IntegratedCustomer key={whatsappChat.id} />}
            </div>
            <div
              ref={setAppointmentHost}
              className="attendance-inline-appointment"
              hidden={!showAppointment}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
