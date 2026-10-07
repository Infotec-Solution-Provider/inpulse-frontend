"use client";

import type { AiUsageSummary } from "@/lib/types/sdk-local.types";
import { MenuItem, Skeleton, TextField, useTheme } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FieldLabel, StatTile, formatTokens, formatUsd, selectMenuProps } from "./presentation";

export type UsagePeriod = "current_month" | "last_30d" | "all";
export type UsageView = "feature" | "operator";

export const PERIOD_OPTIONS: Array<{ value: UsagePeriod; label: string }> = [
	{ value: "current_month", label: "Mês atual" },
	{ value: "last_30d", label: "Últimos 30 dias" },
	{ value: "all", label: "Todo o período" },
];

type UsageRow = {
	key: string;
	name: string;
	callCount: number;
	inputTokens: number;
	outputTokens: number;
	cost: number;
	limit: number | null;
};

// Uma série só: uma cor (indigo), grade e eixos recessivos nos tons slate da página.
const CHART_TOKENS = {
	light: { bar: "#6366f1", grid: "#e2e8f0", tick: "#64748b", label: "#334155", cursor: "rgba(99,102,241,0.08)" },
	dark: { bar: "#818cf8", grid: "#1e293b", tick: "#94a3b8", label: "#cbd5e1", cursor: "rgba(129,140,248,0.10)" },
} as const;

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: UsageRow }> }) {
	const row = active ? payload?.[0]?.payload : undefined;
	if (!row) return null;
	return (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
			<p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{row.name}</p>
			<p className="tabular-nums text-slate-700 dark:text-slate-200">{formatUsd(row.cost)} estimados</p>
			<p className="tabular-nums text-slate-500 dark:text-slate-400">
				{row.callCount.toLocaleString("pt-BR")} chamadas · {formatTokens(row.inputTokens + row.outputTokens)} tokens
			</p>
		</div>
	);
}

function CostChart({ rows }: { rows: UsageRow[] }) {
	const mode = useTheme().palette.mode === "dark" ? "dark" : "light";
	const tokens = CHART_TOKENS[mode];
	const height = Math.max(120, rows.length * 34 + 36);

	return (
		<ResponsiveContainer width="100%" height={height}>
			<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barCategoryGap={8}>
				<CartesianGrid horizontal={false} stroke={tokens.grid} />
				<XAxis
					type="number"
					tickFormatter={(value: number) => formatUsd(value)}
					tick={{ fontSize: 11, fill: tokens.tick }}
					axisLine={false}
					tickLine={false}
				/>
				<YAxis
					type="category"
					dataKey="name"
					width={170}
					tick={{ fontSize: 12, fill: tokens.label }}
					axisLine={false}
					tickLine={false}
				/>
				<Tooltip cursor={{ fill: tokens.cursor }} content={<ChartTooltip />} />
				<Bar dataKey="cost" fill={tokens.bar} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
			</BarChart>
		</ResponsiveContainer>
	);
}

function UsageTable({ rows, view }: { rows: UsageRow[]; view: UsageView }) {
	const cell = "py-2 pl-3 text-right tabular-nums text-slate-700 dark:text-slate-300";
	const head = "pb-2 pl-3 text-right";
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[36rem] text-sm">
				<thead>
					<tr className="border-b border-slate-200 dark:border-slate-700">
						<th className="pb-2 text-left">
							<FieldLabel>{view === "feature" ? "Funcionalidade" : "Operador"}</FieldLabel>
						</th>
						<th className={head}><FieldLabel>Chamadas</FieldLabel></th>
						<th className={head}><FieldLabel>Entrada</FieldLabel></th>
						<th className={head}><FieldLabel>Saída</FieldLabel></th>
						<th className={head}><FieldLabel>Custo</FieldLabel></th>
						{view === "operator" && <th className={head}><FieldLabel>Limite</FieldLabel></th>}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const percent = row.limit ? (row.cost / row.limit) * 100 : null;
						return (
							<tr key={row.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
								<td className="py-2 text-slate-900 dark:text-slate-100">{row.name}</td>
								<td className={cell}>{row.callCount.toLocaleString("pt-BR")}</td>
								<td className={cell}>{formatTokens(row.inputTokens)}</td>
								<td className={cell}>{formatTokens(row.outputTokens)}</td>
								<td className={`${cell} font-medium text-slate-900 dark:text-slate-100`}>{formatUsd(row.cost)}</td>
								{view === "operator" && (
									<td className={cell}>
										{row.limit === null ? (
											<span className="text-slate-400">—</span>
										) : (
											<span
												className={
													percent! >= 90
														? "font-semibold text-red-600 dark:text-red-400"
														: percent! >= 70
															? "font-semibold text-amber-600 dark:text-amber-400"
															: undefined
												}
											>
												{formatUsd(row.limit)} · {percent!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
											</span>
										)}
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export function UsagePanelActions({
	view,
	period,
	onViewChange,
	onPeriodChange,
}: {
	view: UsageView;
	period: UsagePeriod;
	onViewChange: (view: UsageView) => void;
	onPeriodChange: (period: UsagePeriod) => void;
}) {
	return (
		<>
			<div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="tablist">
				{(["feature", "operator"] as const).map((tab) => (
					<button
						key={tab}
						type="button"
						role="tab"
						aria-selected={view === tab}
						onClick={() => onViewChange(tab)}
						className={[
							"rounded-md px-3 py-1 text-sm font-medium transition-colors",
							view === tab
								? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
								: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
						].join(" ")}
					>
						{tab === "feature" ? "Por funcionalidade" : "Por operador"}
					</button>
				))}
			</div>
			<TextField
				select
				size="small"
				label="Período"
				value={period}
				onChange={(event) => onPeriodChange(event.target.value as UsagePeriod)}
				sx={{ minWidth: 170 }}
				slotProps={{ select: { MenuProps: selectMenuProps } }}
			>
				{PERIOD_OPTIONS.map((option) => (
					<MenuItem key={option.value} value={option.value}>
						{option.label}
					</MenuItem>
				))}
			</TextField>
		</>
	);
}

/** Consumo do período: totais, gráfico de custo (uma série) e a tabela com os números. */
export default function UsagePanel({
	usage,
	loading,
	view,
	operatorName,
	operatorLimits,
}: {
	usage: AiUsageSummary | null;
	loading: boolean;
	view: UsageView;
	operatorName: (operatorId: number) => string;
	operatorLimits: Record<string, number>;
}) {
	if (loading || !usage) {
		return loading ? (
			<div className="grid gap-4">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[0, 1, 2, 3].map((index) => (
						<Skeleton key={index} variant="rounded" height={76} />
					))}
				</div>
				<Skeleton variant="rounded" height={160} />
			</div>
		) : (
			<p className="text-sm text-slate-500 dark:text-slate-400">Não foi possível carregar o consumo.</p>
		);
	}

	const rows: UsageRow[] =
		view === "feature"
			? usage.byFeature.map((row) => ({
					key: row.feature,
					name: row.feature,
					callCount: row.callCount,
					inputTokens: row.inputTokens,
					outputTokens: row.outputTokens,
					cost: row.estimatedCostUsd,
					limit: null,
				}))
			: usage.byOperator.map((row) => ({
					key: String(row.operatorId),
					name: operatorName(row.operatorId),
					callCount: row.callCount,
					inputTokens: row.inputTokens,
					outputTokens: row.outputTokens,
					cost: row.estimatedCostUsd,
					limit: operatorLimits[String(row.operatorId)] ?? null,
				}));
	rows.sort((left, right) => right.cost - left.cost);
	const totalCalls = usage.byFeature.reduce((sum, row) => sum + row.callCount, 0);

	return (
		<div className="grid gap-5">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<StatTile label="Custo estimado" value={formatUsd(usage.estimatedCostUsd)} sub="Pelos preços de tabela da OpenAI" />
				<StatTile label="Chamadas" value={totalCalls.toLocaleString("pt-BR")} />
				<StatTile label="Tokens de entrada" value={formatTokens(usage.totalInputTokens)} />
				<StatTile label="Tokens de saída" value={formatTokens(usage.totalOutputTokens)} />
			</div>

			{rows.length === 0 ? (
				<div className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
					<p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sem consumo no período</p>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						{view === "operator"
							? "O consumo por operador vem do copiloto e do Assistente IA usados por cada operador."
							: "As chamadas de IA aparecem aqui assim que forem usadas."}
					</p>
				</div>
			) : (
				<div className="grid gap-4">
					<div>
						<FieldLabel>Custo estimado {view === "feature" ? "por funcionalidade" : "por operador"}</FieldLabel>
						<div className="mt-2">
							<CostChart rows={rows} />
						</div>
					</div>
					<UsageTable rows={rows} view={view} />
				</div>
			)}
		</div>
	);
}
