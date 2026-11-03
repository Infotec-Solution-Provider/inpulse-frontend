import { PilotDesignProvider } from "../../src/lib/ui-system";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import lightTheme from "../../src/lib/themes/light";
import darkTheme from "../../src/lib/themes/dark";
import CrmCatalogPage from "../../src/lib/components/crm-marketing/catalogs";
import CrmExceptionsPage from "../../src/lib/components/crm-marketing/exceptions";
import CrmOrderingPage from "../../src/lib/components/crm-marketing/ordering";
import CrmConfigurationPage from "../../src/lib/components/crm-marketing/configuration";
import CrmUnitsPage from "../../src/lib/components/crm-marketing/units";
import CrmCampaignDetailPage from "../../src/lib/components/crm-marketing/campaign-detail";
import CrmCampaignsPage from "../../src/lib/components/crm-marketing/campaigns";
import { navigate, usePathname } from "../monitor/navigation-doubles";
import { switchAuth } from "./doubles";
const params = new URLSearchParams(location.search),
  panel = params.get("panel") ?? "campaigns";
navigate(
  (panel === "units" ? "/tenant-a/crm-units" : "/tenant-a/crm-exceptions") + location.search,
);
function UnitsRoute() {
  const path = usePathname();
  if (path.includes("/crm-campaigns/"))
    return <CrmCampaignDetailPage campaignId={Number(path.split("/").at(-1))} />;
  if (path.endsWith("/crm-campaigns")) return <CrmCampaignsPage />;
  const tail = path.split("/").at(-1);
  return (
    <CrmUnitsPage
      create={tail === "new"}
      unitId={tail && /^\d+$/.test(tail) ? Number(tail) : undefined}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={params.has("dark") ? darkTheme : lightTheme}>
    <CssBaseline />
    <PilotDesignProvider style={{ height: "100dvh" }}>
      <div style={{ height: "100dvh", paddingTop: 36 }}>
        <div style={{ position: "fixed", top: 0, right: 0, zIndex: 9999 }}>
          <button onClick={() => switchAuth("tenant-b", "token-b")}>Trocar tenant</button>
          <button onClick={() => switchAuth("tenant-a", "refreshed-token")}>Renovar sessão</button>
        </div>
        {panel === "units" ? (
          <UnitsRoute />
        ) : panel === "exceptions" ? (
          <CrmExceptionsPage />
        ) : panel === "ordering" ? (
          <CrmOrderingPage />
        ) : panel === "configuration" ? (
          <CrmConfigurationPage campaignId={10} />
        ) : (
          <CrmCatalogPage catalog={panel === "results" ? "results" : "campaigns"} />
        )}
      </div>
    </PilotDesignProvider>
  </ThemeProvider>,
);
