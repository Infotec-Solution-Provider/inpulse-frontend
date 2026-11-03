import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import CrmProposalsPage from "../../src/lib/components/crm-proposals";
import TelephoneFinishModal from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-finish-modal";
import { switchTenant } from "./doubles";
const finish = new URLSearchParams(location.search).has("finish");
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={createTheme()}>
    <CssBaseline />
    {finish ? (
      <TelephoneFinishModal
        appointment={{ id: 41, contactName: "Cliente exemplo", phone: "11999999999" } as any}
        onConfirm={async (...args) => {
          (window as any).proposalTest.finishes.push(args);
        }}
        onCheckConfirmation={async () => "applied"}
      />
    ) : (
      <>
        <button onClick={switchTenant}>Trocar empresa</button>
        <CrmProposalsPage />
      </>
    )}
  </ThemeProvider>,
);
