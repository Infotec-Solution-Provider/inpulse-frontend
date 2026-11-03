import "./styles.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { SatisfactionManagement } from "../../src/lib/components/crm-satisfaction-management";
import TelephoneFinishModal from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-finish-modal";
import { context, calls } from "./doubles";
const mode = new URLSearchParams(location.search).get("mode");
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={createTheme()}>
    <CssBaseline />
    <div style={{ padding: 16, maxWidth: 1000, margin: "auto" }}>
      {mode === "call" ? (
        <TelephoneFinishModal
          appointment={{ id: 41, contactName: "Cliente de teste", phone: "11999991234" } as any}
          onConfirm={async (...args) => {
            calls.push({ finish: args });
            if ((window as any).fixture.failWrite) throw new Error("unknown");
          }}
          onCheckConfirmation={async () => "applied"}
        />
      ) : (
        <SatisfactionManagement context={context} />
      )}
    </div>
  </ThemeProvider>,
);
