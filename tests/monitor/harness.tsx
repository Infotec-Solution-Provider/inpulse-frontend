import { createRoot } from "react-dom/client";
import { useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@mui/material";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider } from "../../src/lib/ui-system";
import MonitorShell from "../../src/lib/ui-system/monitor-shell";
import Header from "../../src/app/(private)/[instance]/header";
import { isMonitorPath } from "../../src/lib/ui-system/navigation";
import { navigate, usePathname } from "./navigation-doubles";
import MonitorPage from "../../src/app/(private)/[instance]/monitor/page";
import MonitorLayout from "../../src/app/(private)/[instance]/monitor/layout";
import { AuthContext, AppContext, WhatsappContext, socket, state } from "./doubles";
import { authSession } from "../../src/lib/auth-session";
import "./harness.css";

function Harness() {
  const [instance, setInstance] = useState("tenant-a");
  const [token, setToken] = useState("test-token");
  const [role, setRole] = useState("ADMIN");
  const [impersonating, setImpersonating] = useState(false);
  const [userId, setUserId] = useState(1);
  const [reportSales, setReportSales] = useState(
    new URLSearchParams(location.search).has("report-navigation"),
  );
  const whatsapp = useContext(WhatsappContext);
  const [reportsReady, setReportsReady] = useState(whatsapp.loaded);
  const reportContext = useMemo(
    () => ({
      ...whatsapp,
      loaded: reportsReady,
      parameters: {
        ...whatsapp.parameters,
        feature_sales_reports_enabled: String(reportSales),
        feature_reports_advanced_enabled: new URLSearchParams(location.search).has(
          "report-navigation",
        )
          ? "true"
          : "false",
      },
    }),
    [reportSales, reportsReady, whatsapp],
  );
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
      setReportSales,
      setReportsReady,
      setImpersonating,
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
        impersonating,
        user: { CODIGO: userId, NOME: "Supervisor", NIVEL: role } as never,
        signOut: () => {
          setToken("");
          setModal(null);
        },
      }}
    >
      <WhatsappContext.Provider value={reportContext}>
        <AppContext.Provider
          value={{ modal, openModal: setModal, closeModal: () => setModal(null) }}
        >
          <MonitorShell>
            {isMonitorPath(pathname) ? (
              <PilotDesignProvider>
                <MonitorLayout>
                  <MonitorPage />
                </MonitorLayout>
                {appModal}
              </PilotDesignProvider>
            ) : (
              <div aria-label="Conteúdo legado" data-pathname={pathname} style={{ padding: 24 }}>
                Página demonstrativa no layout anterior.{appModal}
              </div>
            )}
          </MonitorShell>
        </AppContext.Provider>
      </WhatsappContext.Provider>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
