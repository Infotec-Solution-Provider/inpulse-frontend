import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { PilotDesignProvider } from "../../src/lib/ui-system";
import light from "../../src/lib/themes/light";
import dark from "../../src/lib/themes/dark";
import CrmImportManagement from "../../src/lib/components/crm-import-management";
import { switchTenant } from "./auth";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={new URLSearchParams(location.search).has("dark") ? dark : light}>
    <CssBaseline />
    <PilotDesignProvider style={{ minHeight: "100dvh" }}>
      <button onClick={switchTenant}>Trocar tenant</button>
      <CrmImportManagement />
    </PilotDesignProvider>
  </ThemeProvider>,
);
