import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import CrmCatalogManagement from "../../src/lib/components/crm-catalog-management";
import type { CrmCatalogName } from "../../src/lib/sdk-local/types/crm-catalogs.types";
import { switchAuth } from "./doubles";
const params = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={params.has("dark") ? darkTheme : lightTheme}>
    <CssBaseline />
    <div style={{ height: "100dvh", paddingTop: 34 }}>
      <div style={{ position: "fixed", zIndex: 9999, top: 0, right: 0 }}>
        <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
        <button onClick={() => switchAuth("tenant-a", "refreshed-token")}>Renovar sessão</button>
      </div>
      <CrmCatalogManagement
        catalog={(params.get("catalog") ?? "customer-groups") as CrmCatalogName}
      />
    </div>
  </ThemeProvider>,
);
