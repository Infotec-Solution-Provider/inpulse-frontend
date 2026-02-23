import DashboardProvider from "./dashboard-context";
import DashboardFilters from "./dashboard-filters";
import DashboardReports from "./dashboard-reports";

export default async function DashboardReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ instance: string }>;
  searchParams?: { report?: string } | Promise<{ report?: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const instance = resolvedParams.instance;
  
  // Apenas adicionar satisfactionSurvey se for a instância exatron
  const allowedReports = new Set<string>([
    "contactsAwaitingReturn",
    "messagesPerUser",
    "messagesPerContact",
    "messagesPerHourDay",
    ...(instance === "exatron" ? ["satisfactionSurvey"] : []),
  ]);

  const resolvedSearchParams = await Promise.resolve(searchParams);

  const initialSelectedReport =
    resolvedSearchParams?.report && allowedReports.has(resolvedSearchParams.report)
      ? (resolvedSearchParams.report as
          | "contactsAwaitingReturn"
          | "messagesPerUser"
          | "messagesPerContact"
          | "messagesPerHourDay"
          | "satisfactionSurvey")
      : undefined;

  return (
    <div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <DashboardProvider initialSelectedReport={initialSelectedReport}>
        <div className="mx-auto grid w-[min(96vw,1800px)] min-w-[1280px] gap-6">
          <DashboardFilters />
          <DashboardReports />
        </div>
      </DashboardProvider>
    </div>
  );
}
