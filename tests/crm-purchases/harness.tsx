import { PilotDesignProvider } from "../../src/lib/ui-system";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import light from "../../src/lib/themes/light";
import dark from "../../src/lib/themes/dark";
import CrmPurchasesPage from "../../src/lib/components/crm-purchases";
import { switchAuth } from "./doubles";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={new URLSearchParams(location.search).has("dark") ? dark : light}>
    <CssBaseline />
    <PilotDesignProvider style={{ height: "100dvh" }}>
      <div style={{ position: "fixed", zIndex: 9999, right: 0, top: 0 }}>
        <button onClick={() => switchAuth("tenant-b", "token-b", 8)}>Trocar empresa</button>
        <button onClick={() => switchAuth("tenant-a", "token-renewed", 7)}>Renovar sessão</button>
      </div>
      <div style={{ height: "100dvh", paddingTop: 32 }}>
        <CrmPurchasesPage />
      </div>
    </PilotDesignProvider>
  </ThemeProvider>,
);
