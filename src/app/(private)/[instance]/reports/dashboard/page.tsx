import DashboardProvider from "./dashboard-context";
import DashboardFilters from "./dashboard-filters";
import DashboardReports from "./dashboard-reports";

const allowedReports = new Set([
  "contactsAwaitingReturn",
  "messagesPerUser",
  "messagesPerContact",
  "messagesPerHourDay",
  "satisfactionSurvey",
]);

export default async function DashboardReportsPage({
  searchParams,
}: {
  searchParams?: { report?: string } | Promise<{ report?: string }>;
}) {
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
    <div className="mx-auto box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <DashboardProvider initialSelectedReport={initialSelectedReport}>
        <div className="grid gap-6">
          <DashboardFilters />
          <DashboardReports />
        </div>
      </DashboardProvider>
    </div>
  );
}
