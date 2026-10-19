import { PilotDesignProvider } from "../../src/lib/ui-system";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import CrmCatalogPage from "../../src/lib/components/crm-marketing/catalogs";
import CrmExceptionsPage from "../../src/lib/components/crm-marketing/exceptions";
import CrmOrderingPage from "../../src/lib/components/crm-marketing/ordering";
import CrmConfigurationPage from "../../src/lib/components/crm-marketing/configuration";
import { navigate } from "../monitor/navigation-doubles";
import { switchAuth } from "./doubles";
const params = new URLSearchParams(location.search),
  panel = params.get("panel") ?? "campaigns";
navigate("/tenant-a/crm-exceptions" + location.search);
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={params.has("dark") ? darkTheme : lightTheme}>
    <CssBaseline />
    <PilotDesignProvider style={{ height: "100dvh" }}>
      <div style={{ height: "100dvh", paddingTop: 36 }}>
        <div style={{ position: "fixed", top: 0, right: 0, zIndex: 9999 }}>
          <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
          <button onClick={() => switchAuth("tenant-a", "refreshed-token")}>Renovar sessão</button>
        </div>
        {panel === "exceptions" ? (
          <CrmExceptionsPage />
        ) : panel === "ordering" ? (
          <CrmOrderingPage />
        ) : panel === "configuration" ? (
          <CrmConfigurationPage campaignId={10} />
        ) : (
          <CrmCatalogPage catalog={panel === "results" ? "results" : "campaigns"} />
        )}
      </div>
    </PilotDesignProvider>
  </ThemeProvider>,
);
