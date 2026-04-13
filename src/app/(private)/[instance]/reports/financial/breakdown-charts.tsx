"use client";

import { useMemo } from "react";
import { Skeleton } from "@mui/material";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useFinancialContext } from "./financial-context";
import { useTheme } from "@mui/material/styles";

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

const COLORS = [
	"#6366f1",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#3b82f6",
	"#ec4899",
	"#14b8a6",
	"#f97316",
	"#8b5cf6",
	"#06b6d4",
];

export default function BreakdownCharts() {
	const { data, isLoading } = useFinancialContext();
	const theme = useTheme();
	const tickColor = theme.palette.text.secondary;

	const tipoData = useMemo(
		() =>
			(data?.byTipo ?? []).map((r) => ({
				name: r.tipo ?? "(sem tipo)",
				faturamento: r.totalFaturamento,
			})),
		[data],
	);

	const formaPgtoData = useMemo(() => {
		const sorted = [...(data?.byFormaPgto ?? [])].sort(
			(a, b) => b.totalFaturamento - a.totalFaturamento,
		);
		const TOP = 9;
		if (sorted.length <= TOP) {
			return sorted.map((r) => ({
				name: r.formaPgto ?? "(sem forma)",
				faturamento: r.totalFaturamento,
			}));
		}
		const top = sorted.slice(0, TOP);
		const othersTotal = sorted.slice(TOP).reduce((sum, r) => sum + r.totalFaturamento, 0);
		return [
			...top.map((r) => ({ name: r.formaPgto ?? "(sem forma)", faturamento: r.totalFaturamento })),
			{ name: "Outros", faturamento: othersTotal },
		];
	}, [data]);

	return (
		<>
			{/* By Tipo */}
			<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">
					Faturamento por Tipo
				</h2>
				{isLoading ? (
					<Skeleton variant="rectangular" height={240} className="rounded-lg" />
				) : tipoData.length === 0 ? (
					<div className="flex h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
						Sem dados
					</div>
				) : (
					<ResponsiveContainer width="100%" height={240}>
						<BarChart data={tipoData} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
							<XAxis
								type="number"
								tickFormatter={(v) => BRL.format(v as number)}
								tick={{ fontSize: 11, fill: tickColor }}
							/>
							<YAxis
								type="category"
								dataKey="name"
								width={90}
								tick={{ fontSize: 11, fill: tickColor }}
							/>
							<Tooltip formatter={(v) => BRL.format(v as number)} />
							<Bar dataKey="faturamento" name="Faturamento" radius={[0, 3, 3, 0]}>
								{tipoData.map((_, i) => (
									<Cell key={i} fill={COLORS[i % COLORS.length]} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>

			{/* By Forma Pgto */}
			<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">
					Faturamento por Forma de Pagamento
				</h2>
				{isLoading ? (
					<Skeleton variant="rectangular" height={240} className="rounded-lg" />
				) : formaPgtoData.length === 0 ? (
					<div className="flex h-[240px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
						Sem dados
					</div>
				) : (
					<ResponsiveContainer width="100%" height={Math.max(240, formaPgtoData.length * 32)}>
						<BarChart data={formaPgtoData} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
							<XAxis
								type="number"
								tickFormatter={(v) => BRL.format(v as number)}
								tick={{ fontSize: 11, fill: tickColor }}
							/>
							<YAxis
								type="category"
								dataKey="name"
								width={160}
								tick={{ fontSize: 11, fill: tickColor }}
							/>
							<Tooltip formatter={(v) => BRL.format(v as number)} />
							<Bar dataKey="faturamento" name="Faturamento" radius={[0, 3, 3, 0]}>
								{formaPgtoData.map((_, i) => (
									<Cell key={i} fill={COLORS[i % COLORS.length]} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		</>
	);
}
