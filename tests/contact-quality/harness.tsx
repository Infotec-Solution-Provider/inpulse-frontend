import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import LinkCustomerModal from "../../src/app/(private)/[instance]/(cruds)/contacts/(table)/(modal)/link-customer-modal";
import type { WppContact } from "../../src/lib/sdk-local";
import { state } from "./doubles";
import "./harness.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={lightTheme}><CssBaseline />
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <LinkCustomerModal contact={{ id: 8, instance: "fixture", name: "Contato de teste", phone: "5511999990000", isBlocked: false, isOnlyAdmin: false } as WppContact} onLinked={async () => { state.refreshed++; }} />
    </div>
  </ThemeProvider>
);
