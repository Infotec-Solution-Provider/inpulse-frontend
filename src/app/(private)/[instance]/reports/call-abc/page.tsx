"use client";

import { useContext } from "react";
import { Alert } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { CallAbcReport } from "@/components/reports/CallAbcReport";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { UserRole } from "@/lib/sdk-local";

export default function CallAbcPage() {
  const { instance, user, token } = useContext(AuthContext);
  const { loaded, parameters } = useWhatsappContext();
  if (!token || !user || !loaded) return <p className="p-6">Carregando sessão…</p>;
  if (user.NIVEL !== UserRole.ADMIN)
    return <Alert severity="warning">Acesso restrito a administradores.</Alert>;
  if (!isFeatureEnabled(parameters, FEATURE_FLAGS.reportsAdvanced))
    return <Alert severity="warning">Relatórios avançados indisponíveis nesta empresa.</Alert>;
  const scope = `${instance}:${user.CODIGO}:call-abc`;
  return <CallAbcReport key={scope} scope={scope} instance={instance} token={token} />;
}
