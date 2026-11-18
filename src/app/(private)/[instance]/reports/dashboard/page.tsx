import { redirect } from "next/navigation";
import { migratedDashboardPath } from "@/lib/reports/attendance-routes";
import DashboardProvider from "./dashboard-context";
import DashboardFilters from "./dashboard-filters";
import DashboardReports from "./dashboard-reports";

export default async function DashboardReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ instance: string }>;
  searchParams?: Promise<{ report?: string }>;
}) {
  const { instance } = await params;
  const { report } = (await searchParams) ?? {};
  const migratedPath = migratedDashboardPath(report ?? "messagesPerUser");
  if (migratedPath) redirect(`/${instance}/reports/${migratedPath}`);
  const valid =
    report === "generalPerformance" ||
    report === "salesFunnel" ||
    (report === "satisfactionSurvey" && instance === "exatron");
  if (!valid) redirect(`/${instance}/reports/messages-per-operator`);

  return (
    <div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <DashboardProvider key={report} initialSelectedReport={report}>
        <div className="mx-auto grid w-[min(96vw,1800px)] min-w-[1280px] gap-6">
          <DashboardFilters />
          <DashboardReports />
        </div>
      </DashboardProvider>
    </div>
  );
}
