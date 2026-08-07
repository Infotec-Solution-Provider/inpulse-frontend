"use client";

import { Skeleton } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DescriptionIcon from "@mui/icons-material/Description";
import PercentIcon from "@mui/icons-material/Percent";
import { useFinancialContext } from "./financial-context";
import type { FinancialSummary } from "@/lib/services/financial.service";

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
});

function goalProgress(actual: number, target: number | null): string | null {
	if (target === null || target <= 0) return null;
	const pct = Math.min(100, (actual / target) * 100).toFixed(1);
	return `${pct}% de ${BRL.format(target)}`;
}

function goalProgressCount(actual: number, target: number | null): string | null {
	if (target === null || target <= 0) return null;
	const pct = Math.min(100, (actual / target) * 100).toFixed(1);
	return `${pct}% de ${target}`;
}

function Delta({ current, previous }: { current: number; previous: number | undefined }) {
	if (previous === undefined || previous === 0) return null;
	const pct = ((current - previous) / previous) * 100;
	const isUp = pct >= 0;
	return (
		<span
			className={`inline-flex items-center text-xs font-semibold ${isUp ? "text-emerald-600" : "text-red-500"}`}
		>
			{isUp ? <ArrowDropUpIcon fontSize="small" /> : <ArrowDropDownIcon fontSize="small" />}
			{Math.abs(pct).toFixed(1)}%
		</span>
	);
}

interface CardProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	sub?: string | null;
	delta?: React.ReactNode;
	color: string;
	isLoading: boolean;
}

function KpiCard({ icon, label, value, sub, delta, color, isLoading }: CardProps) {
	return (
		<div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
			<div className="flex items-center gap-2">
				<span className={`rounded-lg p-2 ${color}`}>{icon}</span>
				<span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
			</div>
			{isLoading ? (
				<>
					<Skeleton variant="text" width="70%" height={36} />
					<Skeleton variant="text" width="50%" height={20} />
				</>
			) : (
				<>
					<div className="flex items-baseline gap-2">
						<span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
						{delta}
					</div>
					{sub && (
						<span className="text-xs text-slate-500 dark:text-slate-400">Meta: {sub}</span>
					)}
				</>
			)}
		</div>
	);
}

function useDelta(field: keyof FinancialSummary, summary: FinancialSummary | undefined, comparison: FinancialSummary | undefined) {
	if (!summary || !comparison) return undefined;
	return <Delta current={summary[field] as number} previous={comparison[field] as number} />;
}

export default function SummaryCards() {
	const { data, isLoading } = useFinancialContext();

	const totalTargetRevenue =
		data?.meta.general.reduce((acc, g) => acc + (g.targetRevenue ?? 0), 0) ?? null;
	const totalTargetCount =
		data?.meta.general.reduce((acc, g) => acc + (g.targetSalesCount ?? 0), 0) ?? null;
	const avgTargetTicket =
		data?.meta.general.length && data.meta.general.some((g) => g.targetAvgTicket !== null)
			? data.meta.general
					.filter((g) => g.targetAvgTicket !== null)
					.reduce((acc, g) => acc + g.targetAvgTicket!, 0) /
				data.meta.general.filter((g) => g.targetAvgTicket !== null).length
			: null;

	const summary = data?.summary;
	const propostas = data?.propostas;
	const comparison = data?.comparison;

	const deltaFat = useDelta("totalFaturamento", summary, comparison);
	const deltaCompras = useDelta("totalCompras", summary, comparison);
	const deltaTicket = useDelta("ticketMedio", summary, comparison);

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
			<KpiCard
				isLoading={isLoading}
				icon={<AttachMoneyIcon className="text-emerald-600" fontSize="small" />}
				label="Faturamento Total"
				value={BRL.format(summary?.totalFaturamento ?? 0)}
				sub={goalProgress(summary?.totalFaturamento ?? 0, totalTargetRevenue)}
				delta={deltaFat}
				color="bg-emerald-50 dark:bg-emerald-900/30"
			/>
			<KpiCard
				isLoading={isLoading}
				icon={<ShoppingCartIcon className="text-blue-600" fontSize="small" />}
				label="Vendas"
				value={String(summary?.totalCompras ?? 0)}
				sub={goalProgressCount(summary?.totalCompras ?? 0, totalTargetCount)}
				delta={deltaCompras}
				color="bg-blue-50 dark:bg-blue-900/30"
			/>
			<KpiCard
				isLoading={isLoading}
				icon={<TrendingUpIcon className="text-violet-600" fontSize="small" />}
				label="Ticket Médio"
				value={BRL.format(summary?.ticketMedio ?? 0)}
				sub={avgTargetTicket !== null ? goalProgress(summary?.ticketMedio ?? 0, avgTargetTicket) : null}
				delta={deltaTicket}
				color="bg-violet-50 dark:bg-violet-900/30"
			/>
			<KpiCard
				isLoading={isLoading}
				icon={<PercentIcon className="text-amber-600" fontSize="small" />}
				label="Taxa de Conversão"
				value={`${(propostas?.taxaConversao ?? 0).toFixed(1)}%`}
				sub={null}
				color="bg-amber-50 dark:bg-amber-900/30"
			/>
			<KpiCard
				isLoading={isLoading}
				icon={<DescriptionIcon className="text-orange-600" fontSize="small" />}
				label="Vendas de Propostas"
				value={String(propostas?.comprasDePropostas ?? 0)}
				sub={null}
				color="bg-orange-50 dark:bg-orange-900/30"
			/>
			<KpiCard
				isLoading={isLoading}
				icon={<AttachMoneyIcon className="text-orange-600" fontSize="small" />}
				label="Fat. de Propostas"
				value={BRL.format(propostas?.faturamentoDePropostas ?? 0)}
				sub={null}
				color="bg-orange-50 dark:bg-orange-900/30"
			/>
		</div>
	);
}
