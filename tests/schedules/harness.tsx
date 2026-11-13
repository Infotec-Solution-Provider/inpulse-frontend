import { createRoot } from "react-dom/client";
import { useState } from "react";
import { Button } from "@mui/material";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider, CrmQueryProvider } from "../../src/lib/ui-system";
import SchedulesModal from "../../src/app/(private)/[instance]/(main)/(chats-menu)/(schedules-modal)/schedules-modal";
import { AuthContext } from "./doubles";
import { authSession } from "../../src/lib/auth-session";
import { useCrmQueryState } from "../../src/lib/ui-system/query-state";
import CustomerBusinessFiltersPanel from "../../src/lib/components/customer-business-filters";
import useCustomerBusinessFilterOptions from "../../src/lib/hooks/use-customer-business-filter-options";
import { createEmptyCustomerBusinessFilters } from "../../src/lib/types/customer-business-filters";

declare global {
  interface Window {
    schedulesHarness: {
      switchUser: (id: number) => void;
      switchTenant: (name: string) => void;
      dark: () => void;
    };
  }
}
function Harness() {
  const [open, setOpen] = useState(true),
    [userId, setUser] = useState(1),
    [instance, setInstance] = useState("suprimaxxi");
  const { setPreference } = useThemeContext();
  const token = `test-${instance}-${userId}`;
  authSession.setAccessToken(token);
  window.schedulesHarness = {
    switchUser: setUser,
    switchTenant: setInstance,
    dark: () => setPreference("dark"),
  };
  const content = (
    <>
      <Button onClick={() => setOpen(true)}>Consultar agendamentos</Button>
      {open && <SchedulesModal onClose={() => setOpen(false)} />}
    </>
  );
  const user = {
    CODIGO: userId,
    NIVEL: "AMBOS",
    VISUALIZA_COMPRAS: new URLSearchParams(location.search).has("financial-denied") ? "NAO" : "SIM",
  };
  return (
    <AuthContext.Provider value={{ instance, token, user }}>
      <CrmQueryProvider scope={`${instance}:${userId}`}>
        {new URLSearchParams(location.search).has("legacy-query") && (
          <LegacyQuerySeed scope={`http://127.0.0.1:4193:${instance}:${userId}`} />
        )}
        {new URLSearchParams(location.search).has("shared-default") ? (
          <SharedDefaultPanel />
        ) : (
          <>
            {new URLSearchParams(location.search).has("legacy") ? (
              content
            ) : (
              <PilotDesignProvider>{content}</PilotDesignProvider>
            )}
          </>
        )}
      </CrmQueryProvider>
    </AuthContext.Provider>
  );
}
function LegacyQuerySeed({ scope }: { scope: string }) {
  useCrmQueryState(`operator-schedules:${scope}`, () => ({
    filters: {
      search: "Fantasma legado",
      profileLevel: "consolidado",
      interactionLevel: "interacao_alta",
      purchaseLevel: "muitas_compras",
      ageLevel: "cliente_novo",
      purchaseInterestLevel: "alto_interesse",
      repurchaseStatuses: ["red"],
    },
    page: 3,
    perPage: 50,
  }));
  return null;
}
function SharedDefaultPanel() {
  const [filters, setFilters] = useState(createEmptyCustomerBusinessFilters);
  const { options } = useCustomerBusinessFilterOptions();
  return <CustomerBusinessFiltersPanel filters={filters} onChange={setFilters} options={options} />;
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
