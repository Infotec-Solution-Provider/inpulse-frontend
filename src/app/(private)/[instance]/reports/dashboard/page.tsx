import { redirect } from "next/navigation";
import { migratedDashboardPath } from "@/lib/reports/attendance-routes";
import { Alert } from "@mui/material";
import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import SalesFunnelReport from "./sales-funnel-report";

export default async function DashboardReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ instance: string }>;
  searchParams?: Promise<{ report?: string }>;
}) {
  const { instance } = await params;
  const { report } = (await searchParams) ?? {};
  if (report === "salesFunnel") {
    return (
      <ReportPageShell
        instance={instance}
        category="Comercial"
        title="Demonstração do funil de vendas"
        description="Exemplo da leitura das etapas de atendimento e venda."
      >
        <Alert severity="info">Demonstração com dados ilustrativos.</Alert>
        <SalesFunnelReport />
      </ReportPageShell>
    );
  }
  const path =
    report === "satisfactionSurvey" && instance === "exatron"
      ? "satisfaction"
      : (migratedDashboardPath(report ?? "") ?? "messages-per-operator");
  redirect(`/${instance}/reports/${path}`);
}
