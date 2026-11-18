"use client";

import { useContext, type ReactNode } from "react";
import { Alert } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { UserRole } from "@/lib/sdk-local";

export default function PersonalizedReportsLayout({ children }: { children: ReactNode }) {
  const { instance, user } = useContext(AuthContext);
  const { loaded, parameters } = useWhatsappContext();
  if (
    loaded &&
    user?.NIVEL === UserRole.ADMIN &&
    isFeatureEnabled(parameters, FEATURE_FLAGS.reportsDashboards)
  )
    return children;

  return (
    <ReportPageShell
      instance={instance}
      category="Personalizados"
      title="Relatórios personalizados"
    >
      <Alert severity={loaded ? "warning" : "info"}>
        {loaded
          ? "Relatórios personalizados indisponíveis para seu acesso."
          : "Verificando acesso aos relatórios…"}
      </Alert>
    </ReportPageShell>
  );
}
