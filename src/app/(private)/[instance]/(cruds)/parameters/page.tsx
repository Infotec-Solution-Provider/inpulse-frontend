"use client";

import { CrmPage } from "@/lib/ui-system";
import { useAuthContext } from "@/app/auth-context";
import { ParameterSettingsPanel } from "@/lib/parameters/parameter-settings-panel";
import { WhatsappParameterSettings } from "@/lib/parameters/whatsapp-parameter-settings";
import { UserRole } from "@/lib/sdk-local";
import { Alert, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import type { ParameterSource } from "@/lib/parameters/parameter-settings.types";
import { useWhatsappContext } from "../../whatsapp-context";

function ParametersScreen() {
  const { refreshParameters } = useWhatsappContext();
  const [tab, setTab] = useState<ParameterSource>("whatsapp");
  const [visitedCrm, setVisitedCrm] = useState(false);
  return (
    <div className="min-w-0" data-testid="parameters-scroll">
      <CrmPage
        title="Parâmetros"
        description="Gerencie as configurações do WhatsApp e do CRM."
        breadcrumbs={[{ label: "Configurações" }, { label: "Parâmetros" }]}
      >
        <div className="rounded-lg border border-[var(--ip-border)] bg-[var(--ip-surface)] shadow-none">
          <Tabs
            value={tab}
            onChange={(_, value: ParameterSource) => {
              setTab(value);
              if (value === "crm") setVisitedCrm(true);
            }}
            aria-label="Parâmetros por sistema"
          >
            <Tab
              label="WhatsApp"
              value="whatsapp"
              id="tab-whatsapp"
              aria-controls="panel-whatsapp"
            />
            <Tab label="CRM" value="crm" id="tab-crm" aria-controls="panel-crm" />
          </Tabs>
        </div>
        <div
          role="tabpanel"
          id="panel-whatsapp"
          aria-labelledby="tab-whatsapp"
          hidden={tab !== "whatsapp"}
        >
          <WhatsappParameterSettings onSaved={refreshParameters} />
        </div>
        <div role="tabpanel" id="panel-crm" aria-labelledby="tab-crm" hidden={tab !== "crm"}>
          {visitedCrm && <ParameterSettingsPanel source="crm" />}
        </div>
      </CrmPage>
    </div>
  );
}

export default function ParametersPage() {
  const { instance, user } = useAuthContext();
  if (user?.NIVEL !== UserRole.ADMIN)
    return (
      <Alert severity="warning" sx={{ m: 3 }}>
        Acesso restrito a administradores.
      </Alert>
    );
  return <ParametersScreen key={`${instance}:${user.CODIGO}`} />;
}
