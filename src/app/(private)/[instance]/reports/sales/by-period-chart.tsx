"use client";

import { useMemo, useState } from "react";
import { MenuItem, Skeleton, TextField } from "@mui/material";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
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

export default function ByPeriodChart() {
	const { data, isLoading, filters } = useFinancialContext();
	const theme = useTheme();
	const [chartType, setChartType] = useState<"bar" | "line">("bar");

	const chartData = useMemo(
		() =>
			(data?.byPeriod ?? []).map((row) => ({
				name: row.periodo,
				faturamento: row.totalFaturamento,
				compras: row.totalCompras,
			})),
		[data],
	);

	const tickColor = theme.palette.text.secondary;
	const label =
		filters.groupBy === "day" ? "Evolução diária de faturamento" : "Evolução mensal de faturamento";

	const chart =
		chartType === "line" ? (
			<LineChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
				<XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} />
				<YAxis tickFormatter={(v) => BRL.format(v as number)} tick={{ fontSize: 11, fill: tickColor }} width={90} />
				<Tooltip formatter={(v) => BRL.format(v as number)} />
				<Line
					type="monotone"
					dataKey="faturamento"
					name="Faturamento"
					stroke="#10b981"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		) : (
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
				<XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} />
				<YAxis tickFormatter={(v) => BRL.format(v as number)} tick={{ fontSize: 11, fill: tickColor }} width={90} />
				<Tooltip formatter={(v) => BRL.format(v as number)} />
				<Bar dataKey="faturamento" name="Faturamento" fill="#10b981" radius={[3, 3, 0, 0]} />
			</BarChart>
		);

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-base font-semibold text-slate-800 dark:text-white">{label}</h2>
				<TextField
					select
					size="small"
					value={chartType}
					onChange={(e) => setChartType(e.target.value as "bar" | "line")}
					className="w-28"
				>
					<MenuItem value="bar">Barras</MenuItem>
					<MenuItem value="line">Linha</MenuItem>
				</TextField>
			</div>

			{isLoading ? (
				<Skeleton variant="rectangular" height={280} className="rounded-lg" />
			) : chartData.length === 0 ? (
				<div className="flex h-[280px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
					Sem dados para o período selecionado
				</div>
			) : (
				<ResponsiveContainer width="100%" height={280}>
					{chart}
				</ResponsiveContainer>
			)}
		</div>
	);
}
