"use client";

import type { User } from "@/lib/sdk-local";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Autocomplete, Button, IconButton, InputAdornment, Skeleton, TextField, Tooltip } from "@mui/material";
import { useState } from "react";
import { toast } from "react-toastify";
import { parsePositiveUsd } from "./settings-form";
import { BudgetBar, FieldLabel, formatUsd, menuPaperSx } from "./presentation";

const usdSlotProps = {
	input: { startAdornment: <InputAdornment position="start">US$</InputAdornment> },
	htmlInput: { inputMode: "decimal" as const },
};

function operatorName(operators: User[], id: string): string {
	const operator = operators.find((entry) => String(entry.CODIGO) === id);
	return operator ? operator.NOME : `Operador #${id}`;
}

function SpendLine({ spent, limit }: { spent: number | null | undefined; limit: number | null }) {
	if (spent === null) return <Skeleton variant="text" width={180} />;
	if (spent === undefined) {
		return <p className="text-sm text-slate-500 dark:text-slate-400">Gasto do mês indisponível no momento.</p>;
	}
	const percent = limit ? (spent / limit) * 100 : null;
	return (
		<div className="grid gap-1.5">
			<p className="text-sm text-slate-600 dark:text-slate-400">
				<span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatUsd(spent)}</span>
				{limit ? (
					<>
						{" "}de <span className="tabular-nums">{formatUsd(limit)}</span>{" "}
						<span
							className={
								percent! >= 90
									? "font-semibold text-red-600 dark:text-red-400"
									: percent! >= 70
										? "font-semibold text-amber-600 dark:text-amber-400"
										: "text-slate-500 dark:text-slate-400"
							}
						>
							({percent!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
						</span>
					</>
				) : (
					" gastos neste mês, sem limite"
				)}
			</p>
			{limit ? <BudgetBar percent={percent!} /> : null}
		</div>
	);
}

/** Limite mensal da empresa e limites individuais por operador, com o gasto do mês ao lado. */
export default function BudgetPanel({
	budget,
	budgetError,
	onBudgetChange,
	monthCost,
	operatorMonthCosts,
	operatorBudgets,
	invalidOperatorId,
	operators,
	onOperatorBudgetChange,
	onRemoveOperator,
}: {
	budget: string;
	budgetError: boolean;
	onBudgetChange: (value: string) => void;
	/** Gasto estimado da empresa no mês atual; null enquanto carrega, undefined se falhou. */
	monthCost: number | null | undefined;
	operatorMonthCosts: Map<number, number> | null;
	operatorBudgets: Record<string, string>;
	invalidOperatorId: string | null;
	operators: User[];
	onOperatorBudgetChange: (operatorId: string, value: string) => void;
	onRemoveOperator: (operatorId: string) => void;
}) {
	const [newOperator, setNewOperator] = useState<User | null>(null);
	const [newLimit, setNewLimit] = useState("");

	const availableOperators = operators.filter((operator) => !(String(operator.CODIGO) in operatorBudgets));
	const entries = Object.entries(operatorBudgets);

	function handleAdd() {
		if (!newOperator || parsePositiveUsd(newLimit) === null) {
			toast.error("Escolha um operador e informe um limite positivo.");
			return;
		}
		onOperatorBudgetChange(String(newOperator.CODIGO), newLimit.trim());
		setNewOperator(null);
		setNewLimit("");
	}

	return (
		<div className="grid gap-5">
			<div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
				<TextField
					label="Limite da empresa"
					size="small"
					value={budget}
					error={budgetError}
					onChange={(event) => onBudgetChange(event.target.value)}
					placeholder="Sem limite"
					helperText="Em branco: sem limite"
					slotProps={usdSlotProps}
				/>
				<div className="sm:pt-1">
					<SpendLine spent={monthCost} limit={parsePositiveUsd(budget)} />
				</div>
			</div>

			<div className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
				<FieldLabel>Limites por operador</FieldLabel>

				{entries.length === 0 ? (
					<p className="text-sm text-slate-500 dark:text-slate-400">Nenhum operador com limite próprio.</p>
				) : (
					<ul className="divide-y divide-slate-100 dark:divide-slate-800">
						{entries.map(([id, value]) => {
							const spent = operatorMonthCosts ? (operatorMonthCosts.get(Number(id)) ?? 0) : null;
							const limit = parsePositiveUsd(value);
							return (
								<li key={id} className="grid grid-cols-[minmax(0,1fr)_9rem_auto] items-center gap-3 py-2">
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
											{operatorName(operators, id)}
										</p>
										<p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
											{spent === null
												? "Gasto do mês: —"
												: `${formatUsd(spent)} no mês${limit ? ` · ${Math.round((spent / limit) * 100)}% do limite` : ""}`}
										</p>
									</div>
									<TextField
										size="small"
										value={value}
										error={invalidOperatorId === id || limit === null}
										onChange={(event) => onOperatorBudgetChange(id, event.target.value)}
										slotProps={{
											...usdSlotProps,
											htmlInput: { ...usdSlotProps.htmlInput, "aria-label": `Limite mensal de ${operatorName(operators, id)}` },
										}}
									/>
									<Tooltip title="Remover limite">
										<IconButton size="small" onClick={() => onRemoveOperator(id)} aria-label="Remover limite">
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</Tooltip>
								</li>
							);
						})}
					</ul>
				)}

				<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
					<Autocomplete
						size="small"
						options={availableOperators}
						value={newOperator}
						onChange={(_, value) => setNewOperator(value)}
						getOptionLabel={(operator) => `${operator.NOME} (#${operator.CODIGO})`}
						isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
						loading={operators.length === 0}
						loadingText="Carregando operadores…"
						noOptionsText="Nenhum operador"
						slotProps={{ paper: { sx: menuPaperSx } }}
						renderInput={(params) => <TextField {...params} label="Adicionar operador" />}
					/>
					<TextField
						size="small"
						label="Limite"
						value={newLimit}
						onChange={(event) => setNewLimit(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") handleAdd();
						}}
						slotProps={usdSlotProps}
					/>
					<Button variant="outlined" onClick={handleAdd} disabled={!newOperator || newLimit.trim() === ""}>
						Adicionar
					</Button>
				</div>
			</div>
		</div>
	);
}
