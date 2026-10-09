"use client";

import { useAuthContext } from "@/app/auth-context";
import { ParameterSettingsPanel } from "@/lib/parameters/parameter-settings-panel";
import { WhatsappParameterSettings } from "@/lib/parameters/whatsapp-parameter-settings";
import { UserRole } from "@/lib/sdk-local";
import { Alert, Paper, Tab, Tabs, Typography } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { useState } from "react";
import type { ParameterSource } from "@/lib/parameters/parameter-settings.types";
import { useWhatsappContext } from "../../whatsapp-context";

function ParametersScreen() {
  const { refreshParameters } = useWhatsappContext();
  const [tab, setTab] = useState<ParameterSource>("whatsapp");
  const [visitedCrm, setVisitedCrm] = useState(false);
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <TuneIcon color="primary" sx={{ mt: 0.5, fontSize: 32 }} />
        <div>
          <Typography component="h1" variant="h4" fontWeight={700}>
            Parâmetros
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Ajuste o funcionamento do WhatsApp e do CRM em um só lugar.
          </Typography>
        </div>
      </div>
      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, value: ParameterSource) => {
            setTab(value);
            if (value === "crm") setVisitedCrm(true);
          }}
          aria-label="Parâmetros por sistema"
        >
          <Tab label="WhatsApp" value="whatsapp" id="tab-whatsapp" aria-controls="panel-whatsapp" />
          <Tab label="CRM" value="crm" id="tab-crm" aria-controls="panel-crm" />
        </Tabs>
      </Paper>
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
