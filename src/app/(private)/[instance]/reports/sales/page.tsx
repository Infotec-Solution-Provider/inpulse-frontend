import FinancialProvider from "./financial-context";
import FinancialReport from "./financial-report";

export default function FinancialDashboardPage() {
  return (
    <FinancialProvider>
      <FinancialReport />
    </FinancialProvider>
  );
}
