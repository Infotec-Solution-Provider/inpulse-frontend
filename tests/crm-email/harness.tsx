import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { EmailWorkspace } from "@/lib/components/crm-email/page";
import { navigate } from "../monitor/navigation-doubles";
navigate(`/tenant-a/crm-email${location.search}`);
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={createTheme()}>
    <CssBaseline />
    <EmailWorkspace
      token="test-token"
      instance="tenant-a"
      isAdmin={!location.search.includes("operator")}
    />
  </ThemeProvider>,
);
