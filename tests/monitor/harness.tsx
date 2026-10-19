import { createRoot } from "react-dom/client";
import { useState, type ReactNode } from "react";
import { Modal } from "@mui/material";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider } from "../../src/lib/ui-system";
import MonitorShell from "../../src/lib/ui-system/monitor-shell";
import Header from "../../src/app/(private)/[instance]/header";
import { isMonitorPath } from "../../src/lib/ui-system/navigation";
import { navigate, usePathname } from "./navigation-doubles";
import MonitorPage from "../../src/app/(private)/[instance]/monitor/page";
import MonitorLayout from "../../src/app/(private)/[instance]/monitor/layout";
import { AuthContext, AppContext, socket, state } from "./doubles";
import { authSession } from "../../src/lib/auth-session";
import "./harness.css";

function Harness() {
  const [instance, setInstance] = useState("tenant-a");
  const [token, setToken] = useState("test-token");
  const [role, setRole] = useState("ADMIN");
  const [userId, setUserId] = useState(1);
  const [modal, setModal] = useState<ReactNode>(null);
  const { setPreference } = useThemeContext();
  const pathname = usePathname();
  authSession.setAccessToken(token);
  Object.assign(window, {
    monitorHarness: {
      switchTenant: (name: string) => {
        setInstance(name);
        setToken(`test-${name}`);
        navigate(`/${name}/monitor`);
      },
      refreshToken: () => setToken("refreshed-token"),
      switchUser: (id: number) => {
        setUserId(id);
        setToken(`test-user-${id}`);
      },
      setRole,
      emit: socket.emit,
      listeners: socket.listenerCount,
      actions: () => state.actions.map(({ type, chatId }) => ({ type, chatId })),
      complete: () => state.actions.at(-1)?.resolve(),
      fail: () => state.actions.at(-1)?.reject(),
      opened: () => state.opened,
      dark: () => {
        setPreference("dark");
      },
      navigate,
    },
  });
  const appModal = (
    <Modal
      open={!!modal}
      onClose={(_event, reason) => {
        if (reason !== "backdropClick") setModal(null);
      }}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div>{modal}</div>
    </Modal>
  );
  return (
    <AuthContext.Provider
      value={{
        instance,
        token,
        user: { CODIGO: userId, NOME: "Supervisor", NIVEL: role } as never,
        signOut: () => {
          setToken("");
          setModal(null);
        },
      }}
    >
      <AppContext.Provider value={{ modal, openModal: setModal, closeModal: () => setModal(null) }}>
        <MonitorShell>
          {isMonitorPath(pathname) ? (
            <PilotDesignProvider>
              <MonitorLayout>
                <MonitorPage />
              </MonitorLayout>
              {appModal}
            </PilotDesignProvider>
          ) : (
            <div aria-label="Conteúdo legado" style={{ padding: 24 }}>
              Página demonstrativa no layout anterior.{appModal}
            </div>
          )}
        </MonitorShell>
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
