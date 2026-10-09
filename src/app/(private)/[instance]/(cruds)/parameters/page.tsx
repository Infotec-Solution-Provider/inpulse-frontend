"use client";

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
    <div
      className="scrollbar-whatsapp box-border h-full min-h-0 w-full overflow-y-auto bg-slate-50 text-slate-800 dark:bg-gray-900 dark:text-slate-200"
      data-testid="parameters-scroll"
    >
      <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Parâmetros</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie as configurações do WhatsApp e do CRM.
          </p>
        </header>
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
      </div>
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
