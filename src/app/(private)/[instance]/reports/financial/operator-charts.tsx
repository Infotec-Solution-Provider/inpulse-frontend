"use client";

import { useMemo, useState, useCallback } from "react";
import { Skeleton } from "@mui/material";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { LegendProps } from "recharts";
import { useTheme } from "@mui/material/styles";
import { useFinancialContext } from "./financial-context";

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

const LINE_COLORS = [
	"#6366f1",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#3b82f6",
	"#ec4899",
	"#14b8a6",
];

const MAX_OPERATORS = 7;

export default function OperatorCharts() {
	const { data, isLoading } = useFinancialContext();
	const theme = useTheme();
	const tickColor = theme.palette.text.secondary;
	const [hiddenOps, setHiddenOps] = useState<Set<string>>(new Set());

	const toggleOp = useCallback((name: string) => {
		setHiddenOps((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	}, []);

	const handleLegendClick = useCallback(
		(e: Parameters<NonNullable<LegendProps["onClick"]>>[0]) => {
			if (typeof e.dataKey === "string") toggleOp(e.dataKey);
		},
		[toggleOp],
	);

	// ── Bar chart: Faturamento vs Meta por Operador ──
	const barData = useMemo(() => {
		if (!data) return [];

		const goalMap = new Map<number, number>();
		for (const g of data.meta.operators) {
			goalMap.set(g.operadorId, (goalMap.get(g.operadorId) ?? 0) + (g.targetRevenue ?? 0));
		}

		return data.byOperator.slice(0, 12).map((op) => ({
			name: op.operadorNome ?? `#${op.operadorId}` ?? "Sem op",
			Faturamento: op.totalFaturamento,
			Meta: op.operadorId !== null ? (goalMap.get(op.operadorId) ?? 0) : 0,
		}));
	}, [data]);

	// ── Line chart: Evolução de faturamento por operador ──
	const { lineData, topOperators } = useMemo(() => {
		if (!data) return { lineData: [], topOperators: [] as string[] };

		// Pick top N operators by total faturamento from byOperator
		const top = data.byOperator
			.filter((op) => op.operadorNome !== null)
			.slice(0, MAX_OPERATORS)
			.map((op) => ({ id: op.operadorId, name: op.operadorNome! }));

		const topIds = new Set(top.map((t) => t.id));

		// Get sorted unique periods
		const periods = [...new Set(data.byPeriodByOperator.map((r) => r.periodo))].sort();

		// Accumulate per operator across periods
		const running: Record<string, number> = {};
		for (const op of top) running[op.name] = 0;

		const rows = periods.map((p) => {
			const entry: Record<string, string | number> = { name: p };
			for (const op of top) {
				const match = data.byPeriodByOperator.find(
					(r) => r.periodo === p && r.operadorId === op.id,
				);
				running[op.name] = (running[op.name] ?? 0) + (match?.totalFaturamento ?? 0);
				entry[op.name] = running[op.name]!;
			}
			return entry;
		});

		// Suppress unused variable warning for topIds
		void topIds;

		return { lineData: rows, topOperators: top.map((t) => t.name) };
	}, [data]);

	const isEmpty = !isLoading && barData.length === 0;

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Faturamento vs Meta por Operador */}
			<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">
					Faturamento vs Meta por Operador
				</h2>
				{isLoading ? (
					<Skeleton variant="rectangular" height={280} className="rounded-lg" />
				) : isEmpty ? (
					<div className="flex h-[280px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
						Sem dados para o período selecionado
					</div>
				) : (
					<ResponsiveContainer width="100%" height={280}>
						<BarChart data={barData} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
							<XAxis
								type="number"
								tickFormatter={(v) => BRL.format(v as number)}
								tick={{ fontSize: 10, fill: tickColor }}
							/>
							<YAxis
								type="category"
								dataKey="name"
								width={110}
								tick={{ fontSize: 11, fill: tickColor }}
							/>
							<Tooltip formatter={(v) => BRL.format(v as number)} />
							<Legend />
							<Bar dataKey="Faturamento" fill="#10b981" radius={[0, 3, 3, 0]} />
							<Bar dataKey="Meta" fill="#94a3b8" radius={[0, 3, 3, 0]} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>

			{/* Evolução de faturamento por operador */}
			<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">
					Faturamento Acumulado por Operador
				</h2>
				{isLoading ? (
					<Skeleton variant="rectangular" height={280} className="rounded-lg" />
				) : lineData.length === 0 ? (
					<div className="flex h-[280px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
						Sem dados para o período selecionado
					</div>
				) : (
					<ResponsiveContainer width="100%" height={280}>
						<LineChart data={lineData}>
							<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
							<XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} />
							<YAxis
								tickFormatter={(v) => BRL.format(v as number)}
								tick={{ fontSize: 10, fill: tickColor }}
								width={90}
							/>
							<Tooltip formatter={(v) => BRL.format(v as number)} />
							<Legend
								onClick={handleLegendClick}
								formatter={(value) => (
									<span
										style={{
											color: hiddenOps.has(value) ? theme.palette.text.disabled : theme.palette.text.primary,
											cursor: "pointer",
											textDecoration: hiddenOps.has(value) ? "line-through" : "none",
										}}
									>
										{value}
									</span>
								)}
							/>
							{topOperators.map((name, i) => (
								<Line
									key={name}
									type="monotone"
									dataKey={name}
									stroke={LINE_COLORS[i % LINE_COLORS.length]}
									strokeWidth={2}
									dot={false}
									hide={hiddenOps.has(name)}
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
}
