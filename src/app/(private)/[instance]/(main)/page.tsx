"use client";
import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";
import React, { useContext } from "react";
import { Dialog, DialogContent, DialogTitle, useMediaQuery } from "@mui/material";
import { WhatsappContext } from "../whatsapp-context";
import { AuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import { TelephonyPanel, TelephonyPanelSlot } from "@/lib/telephony/telephony-panel";
import { AttendanceCallBar } from "@/lib/telephony/attendance-call-bar";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { UiIcon } from "@/lib/ui-system/icons";
import { useAttendanceView } from "./attendance-view";
import { AttendanceViewMenu } from "./attendance-view-menu";
import { useIntegratedCallHistory } from "./integrated-call-history";
import { IntegratedCustomer } from "./integrated-customer";
import IntegratedCallContact, { hasWhatsappLookup } from "./integrated-call-contact";
import "./attendance.css";

export default function Home() {
  const { currentChat, setCurrentChat } = useContext(WhatsappContext);
  const { user, instance } = useContext(AuthContext);
  const phone = useTelephony();
  const [view, selectView] = useAttendanceView(instance, user?.CODIGO);
  const viewOptions = phone.enabled ? { view, selectView } : undefined;
  const integrated = phone.enabled && view === "integrated";
  const mobile = useMediaQuery("(max-width: 767px)");
  const wide = useMediaQuery("(min-width: 1140px)");
  const [appointmentHost, setAppointmentHost] = React.useState<HTMLDivElement | null>(null);
  const [appointmentOpen, setAppointmentOpen] = React.useState(false);
  const [customerPreference, setCustomerPreference] = React.useState<boolean | null>(null);
  const customerOpen = customerPreference ?? wide;
  const [dialerOpen, setDialerOpen] = React.useState(false);
  const [historyVersion, refreshHistory] = React.useReducer((version: number) => version + 1, 0);
  const showAppointment = integrated && appointmentOpen;
  const showWorkspace = !!currentChat || showAppointment;
  const whatsappChat = currentChat?.chatType === "wpp" ? currentChat : null;
  const dockCall = integrated && phone.busy;
  const dockInQueue = mobile && !showWorkspace;
  const canOpenDialer = integrated && mobile && !dockCall;
  const openDialer = canOpenDialer ? () => setDialerOpen(true) : undefined;
  const closeDialer = () => setDialerOpen(false);
  const callBar = dockCall ? (
    <AttendanceCallBar
      key={phone.state.callId ?? phone.state.number}
      callContext={
        hasWhatsappLookup(phone.state.number) ? (
          <IntegratedCallContact number={phone.state.number} />
        ) : undefined
      }
    />
  ) : null;
  React.useEffect(() => {
    if (!canOpenDialer) setDialerOpen(false);
  }, [canOpenDialer]);
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
    >
      <div className={`chats-menu min-h-0 ${showWorkspace ? "hidden" : "block"} md:block`}>
        <div className="attendance-queue-stack">
          {dockInQueue && callBar}
          <ChatsMenu
            integrated={integrated}
            dockCall={dockCall}
            viewOptions={viewOptions}
            appointmentHost={appointmentHost}
            onAppointmentOpenChange={setAppointmentOpen}
            onAppointmentFinished={refreshHistory}
          />
        </div>
      </div>
      <div
        className={`chat-panel-container min-h-0 min-w-0 overflow-hidden ${showWorkspace ? "flex" : "hidden"} h-full flex-col md:flex`}
      >
        {currentChat && !integrated && (
          <TelephonyPanelSlot className="max-h-[40%] shrink-0 overflow-y-auto p-2 md:hidden" />
        )}
        {!currentChat && !dockInQueue && callBar}
        <div className="attendance-workspace" data-has-chat={!!currentChat}>
          <div
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${showAppointment && !currentChat ? "hidden md:block" : ""}`}
          >
            {!currentChat && (
              <div className="ip-attendance-welcome">
                <span className="ip-attendance-welcome-icon">
                  <UiIcon name="conversations" scale="empty" />
                </span>
                <h1>
                  {showAppointment ? "Atendimento telefônico aberto" : "Selecione uma conversa"}
                </h1>
                <p>
                  {showAppointment
                    ? "Use os contatos no painel ao lado para abrir o WhatsApp."
                    : "Abra um contato da fila para acompanhar o histórico e responder."}
                </p>
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
                callBar={callBar}
                viewOptions={mobile ? viewOptions : undefined}
                onOpenDialer={openDialer}
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
                callBar={callBar}
                viewOptions={mobile ? viewOptions : undefined}
                onOpenDialer={openDialer}
                customerPanel={
                  integrated && !showAppointment
                    ? {
                        expanded: customerOpen,
                        toggle: () => setCustomerPreference(!customerOpen),
                      }
                    : undefined
                }
              />
            )}
          </div>
          <aside
            className="attendance-integrated-details"
            aria-label="Dados do atendimento"
            hidden={!integrated || (!showAppointment && (!whatsappChat || !customerOpen))}
            data-appointment-open={showAppointment}
          >
            {mobile && !currentChat && showAppointment && viewOptions && (
              <div className="attendance-appointment-options">
                {openDialer && (
                  <button type="button" onClick={openDialer}>
                    Discador
                  </button>
                )}
                <AttendanceViewMenu options={viewOptions} />
              </div>
            )}
            <div
              id="attendance-customer-summary"
              hidden={showAppointment || !whatsappChat || !customerOpen}
            >
              {integrated && whatsappChat && (
                <IntegratedCustomer
                  key={whatsappChat.id}
                  onClose={() => setCustomerPreference(false)}
                />
              )}
            </div>
            <div
              ref={setAppointmentHost}
              className="attendance-inline-appointment"
              hidden={!showAppointment}
            />
          </aside>
        </div>
      </div>
      <Dialog
        open={dialerOpen && Boolean(openDialer)}
        onClose={closeDialer}
        fullWidth
        maxWidth="xs"
        aria-labelledby="attendance-dialer-heading"
      >
        <DialogTitle id="attendance-dialer-heading">Discador</DialogTitle>
        <DialogContent>
          <TelephonyPanel />
        </DialogContent>
      </Dialog>
    </section>
  );
}
