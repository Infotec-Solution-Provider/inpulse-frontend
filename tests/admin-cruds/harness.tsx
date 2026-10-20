// @ts-nocheck — visual fixtures intentionally avoid live authentication and providers.
import "../monitor/harness.css";
import { createRoot } from "react-dom/client";
import { useContext, useState } from "react";
import { Modal } from "@mui/material";
import { ThemeProvider, useThemeContext } from "../../src/app/theme-context";
import { PilotDesignProvider, CrmQueryProvider } from "../../src/lib/ui-system";
import Shell from "../../src/lib/ui-system/monitor-shell";
import { navigate, usePathname } from "../monitor/navigation-doubles";
import Mass from "../../src/app/(private)/[instance]/tools/mass-messages/page";
import Metrics from "../../src/app/(private)/[instance]/reports/metrics/page";
import MetricNew from "../../src/app/(private)/[instance]/reports/metrics/new/page";
import Dashboards from "../../src/app/(private)/[instance]/reports/dashboards/page";
import DashboardDetail from "../../src/app/(private)/[instance]/reports/dashboards/[id]/page";
import Generated from "../../src/app/(private)/[instance]/reports/generated/page";
import Generator from "../../src/app/(private)/[instance]/reports/report-generator/page";
import ProviderContracts from "./provider-contracts";
import Contacts from "../../src/app/(private)/[instance]/(cruds)/contacts/page";
import ReadyMessages from "../../src/app/(private)/[instance]/(cruds)/ready-messages/page";
import InternalGroups from "../../src/app/(private)/[instance]/(cruds)/internal-groups/page";
import Rules from "../../src/app/(private)/[instance]/(cruds)/auto-response/page";
import Senders from "../../src/app/(private)/[instance]/(cruds)/whatsapp-senders/page";
import Requests from "../../src/app/(private)/[instance]/(cruds)/contact-requests/page";
import Agents from "../../src/app/(private)/[instance]/(cruds)/ai-agents/page";
import AiSettings from "../../src/app/(private)/[instance]/(cruds)/ai-settings/page";
import Wallets from "../../src/app/(private)/[instance]/(cruds)/wallets/page";
import Sip from "../../src/app/(private)/[instance]/(cruds)/sip-config/page";
import Pipelines from "../../src/app/(private)/[instance]/(cruds)/funnel/page";
import Configuration from "../../src/app/(private)/[instance]/(cruds)/funnel/[funnelId]/config/page";
import { PreviewProviders, AppContext, AuthContext, state } from "./doubles";
navigate("/tenant-a/ready-messages");
const screens = {
  "provider-contracts": ProviderContracts,
  "mass-messages": Mass,
  metrics: Metrics,
  new: MetricNew,
  dashboards: Dashboards,
  generated: Generated,
  "report-generator": Generator,
  "1": DashboardDetail,
  contacts: Contacts,
  "ready-messages": ReadyMessages,
  "internal-groups": InternalGroups,
  "auto-response": Rules,
  "whatsapp-senders": Senders,
  "contact-requests": Requests,
  "ai-agents": Agents,
  "ai-settings": AiSettings,
  wallets: Wallets,
  "sip-config": Sip,
  funnel: Pipelines,
  config: Configuration,
};
function PreviewModal() {
  const { modal, closeModal } = useContext(AppContext);
  return (
    <Modal
      open={!!modal}
      onClose={closeModal}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div className="ip-crud-modal-host">{modal}</div>
    </Modal>
  );
}
function Preview() {
  const path = usePathname(),
    { setPreference } = useThemeContext();
  const [tenant, setTenant] = useState("tenant-a"),
    [actor, setActor] = useState(1);
  const Screen = screens[path.split("/").at(-1)] ?? ReadyMessages;
  Object.assign(window, {
    adminCrudTest: {
      navigate: (route) => navigate(`/${tenant}/${route}`),
      theme: setPreference,
      fail: () => (state.fail = true),
      massState: (flags) => Object.assign(state, flags),
      calls: () => state.calls,
      switchTenant: setTenant,
      switchActor: setActor,
    },
  });
  return (
    <AuthContext.Provider
      value={{
        instance: tenant,
        token: "fixture",
        user: { CODIGO: actor, NOME: "Supervisão fictícia", NIVEL: "ADMIN", SETOR: 1 },
        signOut() {},
      }}
    >
      <CrmQueryProvider scope={`${tenant}:${actor}`}>
        <PreviewProviders key={`${tenant}:${actor}`}>
          <Shell>
            <PilotDesignProvider>
              <Screen />
              <PreviewModal />
            </PilotDesignProvider>
          </Shell>
        </PreviewProviders>
      </CrmQueryProvider>
    </AuthContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Preview />
  </ThemeProvider>,
);
