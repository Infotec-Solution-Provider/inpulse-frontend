import DashboardProvider from "../dashboard/dashboard-context";
import OperatorPerformanceContent from "./operator-performance-content";

export default function OperatorPerformancePage() {
  return (
    <div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <DashboardProvider initialSelectedReport="operatorPerformance">
        <OperatorPerformanceContent />
      </DashboardProvider>
    </div>
  );
}
