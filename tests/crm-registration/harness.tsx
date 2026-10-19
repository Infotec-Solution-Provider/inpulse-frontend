import { PilotDesignProvider } from "../../src/lib/ui-system";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import light from "../../src/lib/themes/light";
import dark from "../../src/lib/themes/dark";
import CustomerCrmManagement from "../../src/lib/components/crm-customer-management";
import { switchAuth } from "./doubles";
const params = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={params.has("dark") ? dark : light}>
    <CssBaseline />
    <PilotDesignProvider style={{ height: "100dvh" }}>
      <div style={{ position: "fixed", top: 0, right: 0, zIndex: 9999 }}>
        <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
        <button onClick={() => switchAuth("tenant-a", "token-refreshed")}>Renovar sessão</button>
      </div>
      <div style={{ paddingTop: 30 }}>
        <CustomerCrmManagement customerId={params.has("new") ? undefined : 41} />
      </div>
    </PilotDesignProvider>
  </ThemeProvider>,
);
