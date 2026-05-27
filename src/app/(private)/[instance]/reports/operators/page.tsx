import OperatorsDashboard from "./operators-dashboard";

export default function OperatorsDashboardPage() {
  return (
    <div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <div className="mx-auto grid w-[min(96vw,1800px)] gap-6">
        <OperatorsDashboard />
      </div>
    </div>
  );
}