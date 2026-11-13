import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Button } from "@mui/material";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider, CrmQueryProvider } from "../../src/lib/ui-system";
import SchedulesModal from "../../src/app/(private)/[instance]/(main)/(chats-menu)/(schedules-modal)/schedules-modal";
import { AuthContext } from "./doubles";
import { authSession } from "../../src/lib/auth-session";

declare global {
  interface Window {
    schedulesHarness: {
      switchUser: (id: number) => void;
      switchTenant: (name: string) => void;
      dark: () => void;
    };
  }
}
function Harness() {
  const [open, setOpen] = useState(true),
    [userId, setUser] = useState(1),
    [instance, setInstance] = useState("suprimaxxi");
  const { setPreference } = useThemeContext();
  const token = `test-${instance}-${userId}`;
  authSession.setAccessToken(token);
  window.schedulesHarness = {
    switchUser: setUser,
    switchTenant: setInstance,
    dark: () => setPreference("dark"),
  };
  const content = (
    <>
      <Button onClick={() => setOpen(true)}>Consultar agendamentos</Button>
      {open && <SchedulesModal onClose={() => setOpen(false)} />}
    </>
  );
  return (
    <AuthContext.Provider value={{ instance, token, user: { CODIGO: userId } }}>
      <CrmQueryProvider scope={`${instance}:${userId}`}>
        {new URLSearchParams(location.search).has("legacy") ? (
          content
        ) : (
          <PilotDesignProvider>{content}</PilotDesignProvider>
        )}
      </CrmQueryProvider>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
