"use client";

import { Button, ButtonGroup, CircularProgress, MenuItem, TextField, Tooltip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { useFinancialContext } from "./financial-context";

function toDateStr(d: Date): string {
	return d.toISOString().split("T")[0]!;
}

const TODAY = () => {
	const now = new Date();
	return { startDate: toDateStr(now), endDate: toDateStr(now) };
};

const THIS_WEEK = () => {
	const now = new Date();
	const mon = new Date(now);
	mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // ISO Monday
	return { startDate: toDateStr(mon), endDate: toDateStr(now) };
};

const THIS_MONTH = () => {
	const now = new Date();
	return { startDate: toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: toDateStr(now) };
};

const LAST_MONTH = () => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const end = new Date(now.getFullYear(), now.getMonth(), 0);
	return { startDate: toDateStr(start), endDate: toDateStr(end) };
};

const THIS_YEAR = () => {
	const now = new Date();
	return { startDate: toDateStr(new Date(now.getFullYear(), 0, 1)), endDate: toDateStr(now) };
};

const shortcuts = [
	{ label: "Hoje", fn: TODAY },
	{ label: "Esta semana", fn: THIS_WEEK },
	{ label: "Este mês", fn: THIS_MONTH },
	{ label: "Mês passado", fn: LAST_MONTH },
	{ label: "Este ano", fn: THIS_YEAR },
];

export default function FinancialFilters() {
	const { filters, setFilter, data, isLoading, loadDashboard, setGoalsOpen } =
		useFinancialContext();

	const operators = (data?.byOperator ?? []).filter((o) => o.operadorId !== null);

	function applyShortcut(fn: () => { startDate: string; endDate: string }) {
		const { startDate, endDate } = fn();
		setFilter("startDate", startDate);
		setFilter("endDate", endDate);
	}

	const isActive = (fn: () => { startDate: string; endDate: string }) => {
		const { startDate, endDate } = fn();
		return filters.startDate === startDate && filters.endDate === endDate;
	};

	return (
		<div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
			{/* Quick shortcuts */}
			<ButtonGroup size="small" variant="outlined">
				{shortcuts.map(({ label, fn }) => (
					<Button
						key={label}
						onClick={() => applyShortcut(fn)}
						variant={isActive(fn) ? "contained" : "outlined"}
					>
						{label}
					</Button>
				))}
			</ButtonGroup>

			{/* Filters row */}
			<div className="flex flex-wrap items-end gap-3">
				<TextField
					label="Data inicial"
					type="date"
					size="small"
					value={filters.startDate}
					onChange={(e) => setFilter("startDate", e.target.value)}
					InputLabelProps={{ shrink: true }}
					className="w-44"
				/>

				<TextField
					label="Data final"
					type="date"
					size="small"
					value={filters.endDate}
					onChange={(e) => setFilter("endDate", e.target.value)}
					InputLabelProps={{ shrink: true }}
					className="w-44"
				/>

				<TextField
					label="Operador"
					select
					size="small"
					value={filters.operadorId ?? ""}
					onChange={(e) => {
						const v = e.target.value;
						setFilter("operadorId", v === "" ? undefined : Number(v));
					}}
					className="w-48"
				>
					<MenuItem value="">Todos</MenuItem>
					{operators.map((o) => (
						<MenuItem key={o.operadorId} value={o.operadorId!}>
							{o.operadorNome ?? `Operador ${o.operadorId}`}
						</MenuItem>
					))}
				</TextField>

				<TextField
					label="Situação"
					select
					size="small"
					value={filters.situacao ?? ""}
					onChange={(e) => {
						const v = e.target.value;
						setFilter("situacao", v === "" ? undefined : v);
					}}
					className="w-44"
				>
					<MenuItem value="">Todas</MenuItem>
					<MenuItem value="F">Faturado</MenuItem>
					<MenuItem value="C">Cancelado</MenuItem>
				</TextField>

				<TextField
					label="Agrupar por"
					select
					size="small"
					value={filters.groupBy}
					onChange={(e) => setFilter("groupBy", e.target.value as "day" | "month")}
					className="w-36"
				>
					<MenuItem value="month">Mês</MenuItem>
					<MenuItem value="day">Dia</MenuItem>
				</TextField>

				<Button
					variant="contained"
					onClick={loadDashboard}
					disabled={isLoading}
					startIcon={
						isLoading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />
					}
				>
					Buscar
				</Button>

				<Tooltip title="Gerenciar metas financeiras">
					<Button
						variant="outlined"
						onClick={() => setGoalsOpen(true)}
						startIcon={<TrackChangesIcon />}
					>
						Metas
					</Button>
				</Tooltip>
			</div>
		</div>
	);
}
