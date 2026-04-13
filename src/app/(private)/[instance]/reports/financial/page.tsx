import FinancialProvider from "./financial-context";
import FinancialFilters from "./financial-filters";
import SummaryCards from "./summary-cards";
import ByPeriodChart from "./by-period-chart";
import BreakdownCharts from "./breakdown-charts";
import ByOperatorTable from "./by-operator-table";
import GoalsModal from "./goals-modal";
import OperatorCharts from "./operator-charts";

export default function FinancialDashboardPage() {
	return (
		<div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
			<FinancialProvider>
				<div className="mx-auto grid w-[min(96vw,1600px)] gap-6">
					<div>
						<h1 className="mb-1 text-2xl font-bold text-slate-800 dark:text-white">
							Dashboard Financeiro
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Análise de vendas e metas com base na base de dados do CRM
						</p>
					</div>

					<FinancialFilters />
					<SummaryCards />
					<ByPeriodChart />

					<div className="grid gap-6 lg:grid-cols-2">
						<BreakdownCharts />
					</div>

					<OperatorCharts />
					<ByOperatorTable />

					<GoalsModal />
				</div>
			</FinancialProvider>
		</div>
	);
}
