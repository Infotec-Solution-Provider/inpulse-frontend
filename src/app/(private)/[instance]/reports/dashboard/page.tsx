import DashboardProvider from "./dashboard-context";
import DashboardFilters from "./dashboard-filters";
import DashboardReports from "./dashboard-reports";

export default function DashboardReportsPage() {
  return (
    <div className="mx-auto box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <DashboardProvider>
        <div className="grid gap-6">
          <DashboardFilters />
          <DashboardReports />
        </div>
      </DashboardProvider>
    </div>
  );
}
