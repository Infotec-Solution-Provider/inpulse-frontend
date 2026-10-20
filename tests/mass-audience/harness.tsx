import "../monitor/harness.css";
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider, CrmQueryProvider } from "../../src/lib/ui-system";
import MassMessagesPage from "../../src/app/(private)/[instance]/tools/mass-messages/page";
import { AuthContext } from "./doubles";
function Harness() {
  const [instance, setInstance] = useState("fixture-a");
  const { toggleTheme } = useThemeContext();
  return (
    <AuthContext.Provider
      value={{
        instance,
        token: `${instance}-token`,
        user: { CODIGO: 1, NOME: "Operador fictício" },
      }}
    >
      <button onClick={toggleTheme}>Trocar tema</button>
      <button
        onClick={() => setInstance((value) => (value === "fixture-a" ? "fixture-b" : "fixture-a"))}
      >
        Trocar tenant
      </button>
      <CrmQueryProvider scope={instance}>
        <PilotDesignProvider>
          <MassMessagesPage />
        </PilotDesignProvider>
      </CrmQueryProvider>
      <ToastContainer />
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
