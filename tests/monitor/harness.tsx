import { createRoot } from "react-dom/client";
import { useState, type ReactNode } from "react";
import { createTheme, ThemeProvider, Modal } from "@mui/material";
import MonitorPage from "../../src/app/(private)/[instance]/monitor/page";
import MonitorLayout from "../../src/app/(private)/[instance]/monitor/layout";
import { AuthContext, AppContext, socket, state } from "./doubles";
import { authSession } from "../../src/lib/auth-session";
import "./harness.css";

function Harness() {
  const [instance, setInstance] = useState("tenant-a");
  const [token, setToken] = useState("test-token");
  const [role, setRole] = useState("ADMIN");
  const [modal, setModal] = useState<ReactNode>(null);
  const [dark, setDark] = useState(false);
  authSession.setAccessToken(token);
  Object.assign(window, {
    monitorHarness: {
      switchTenant: (name: string) => {
        setInstance(name);
        setToken(`test-${name}`);
      },
      refreshToken: () => setToken("refreshed-token"),
      setRole,
      emit: socket.emit,
      listeners: socket.listenerCount,
      actions: () => state.actions.map(({ type, chatId }) => ({ type, chatId })),
      complete: () => state.actions.at(-1)?.resolve(),
      fail: () => state.actions.at(-1)?.reject(),
      opened: () => state.opened,
      dark: () => {
        document.documentElement.classList.add("dark");
        setDark(true);
      },
    },
  });
  return (
    <ThemeProvider theme={createTheme({ palette: { mode: dark ? "dark" : "light" } })}>
      <AuthContext.Provider
        value={{ instance, token, user: { CODIGO: 1, NOME: "Supervisor", NIVEL: role } as never }}
      >
        <AppContext.Provider
          value={{ modal, openModal: setModal, closeModal: () => setModal(null) }}
        >
          <MonitorLayout>
            <MonitorPage />
          </MonitorLayout>
          <Modal
            open={!!modal}
            onClose={() => setModal(null)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div>{modal}</div>
          </Modal>
        </AppContext.Provider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
