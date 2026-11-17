import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { PilotDesignProvider } from "../../src/lib/ui-system/provider";
import { AuthContext } from "./auth-stub";
import type { AuthContextProps } from "../../src/lib/types/auth-context.types";
import { UserRole } from "../../src/lib/sdk-local";
import { availableReports } from "../../src/lib/reports/catalog";
import { ReportCatalogView } from "../../src/components/reports/ReportCatalog";
import { MessagesPerOperatorReport } from "../../src/components/reports/MessagesPerOperatorReport";
import FinancialProvider from "../../src/app/(private)/[instance]/reports/sales/financial-context";
import FinancialReport from "../../src/app/(private)/[instance]/reports/sales/financial-report";
import "./styles.css";

function Harness() {
  const [page, setPage] = useState("central");
  const [instance, setInstance] = useState("tenant-a");
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const auth = {
    instance,
    token: instance,
    user: { CODIGO: 1, NIVEL: UserRole.ADMIN },
  } as AuthContextProps;
  const reports = availableReports(
    {
      feature_reports_advanced_enabled: "true",
      feature_sales_reports_enabled: "true",
      feature_chat_export_enabled: "true",
    },
    UserRole.ADMIN,
    instance,
  );
  const theme = useMemo(() => createTheme({ palette: { mode: dark ? "dark" : "light" } }), [dark]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthContext.Provider value={auth}>
        <div
          className={dark ? "dark" : ""}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <nav
            aria-label="Controles da validação"
            className="flex flex-wrap gap-3 border-b bg-slate-100 p-3 text-sm text-slate-900"
          >
            <button onClick={() => setPage("central")}>Central</button>
            <button onClick={() => setPage("messages")}>Mensagens</button>
            <button onClick={() => setPage("sales")}>Vendas</button>
            <button
              onClick={() =>
                setInstance((current) => (current === "tenant-a" ? "tenant-b" : "tenant-a"))
              }
            >
              Trocar tenant
            </button>
            <button onClick={() => setDark(!dark)}>Alternar tema</button>
          </nav>
          <main style={{ minHeight: 0, flex: 1 }}>
            <PilotDesignProvider style={{ height: "100%", minWidth: 0 }}>
              {page === "central" ? (
                <ReportCatalogView
                  instance={instance}
                  reports={reports}
                  query={query}
                  category={category}
                  onChange={(q, c) => {
                    setQuery(q);
                    setCategory(c);
                  }}
                />
              ) : page === "messages" ? (
                <MessagesPerOperatorReport
                  key={instance}
                  instance={instance}
                  token={instance}
                  scope={`${instance}:1`}
                />
              ) : (
                <FinancialProvider>
                  <FinancialReport />
                </FinancialProvider>
              )}
            </PilotDesignProvider>
          </main>
        </div>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
