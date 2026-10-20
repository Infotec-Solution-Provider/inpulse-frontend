import "../../src/app/globals.css";
import "./harness.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider } from "../../src/lib/ui-system";
import MonitorShell from "../../src/lib/ui-system/monitor-shell";
import { TelephonyProvider } from "../../src/lib/telephony/telephony-provider";
import ChatProvider from "../../src/app/(private)/[instance]/(main)/(chat)/chat-context";
import Home from "../../src/app/(private)/[instance]/(main)/page";
import { navigate } from "../monitor/navigation-doubles";
import {
  AppContext,
  AuthContext,
  auth,
  ContactsContext,
  InternalChatContext,
  internal,
  makeWhatsapp,
  rejectUnknown,
  resolveSend,
  state,
  useEnvironment,
  WhatsappContext,
} from "./doubles";

navigate("/tenant-a/");
const fixture = { state, resolveSend, rejectUnknown, theme: (_mode: "light" | "dark") => {} };
declare global {
  interface Window {
    attendanceFixture: typeof fixture;
  }
}
window.attendanceFixture = fixture;
function Content() {
  const theme = useThemeContext();
  fixture.theme = theme.setPreference;
  return (
    <MonitorShell>
      <PilotDesignProvider>
        <Home />
      </PilotDesignProvider>
    </MonitorShell>
  );
}
function Harness() {
  const env = useEnvironment();
  const [modal, setModal] = useState<React.ReactNode>(null);
  return (
    <AuthContext.Provider value={auth}>
      <AppContext.Provider value={{ openModal: setModal, closeModal: () => setModal(null) }}>
        <ContactsContext.Provider value={{ state: { contacts: [] } }}>
          <InternalChatContext.Provider value={internal}>
            <WhatsappContext.Provider value={makeWhatsapp(env)}>
              <ThemeProvider>
                <ChatProvider>
                  <TelephonyProvider>
                    <Content />
                    {modal}
                  </TelephonyProvider>
                </ChatProvider>
              </ThemeProvider>
            </WhatsappContext.Provider>
          </InternalChatContext.Provider>
        </ContactsContext.Provider>
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
