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

export default function DashboardReportsPage({
  searchParams,
}: {
  searchParams?: { report?: string };
}) {
  const initialSelectedReport =
    searchParams?.report && allowedReports.has(searchParams.report)
      ? (searchParams.report as
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
