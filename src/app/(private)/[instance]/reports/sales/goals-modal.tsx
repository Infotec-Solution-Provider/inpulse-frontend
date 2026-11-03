"use client";

import { useParams } from "next/navigation";
import GoalAssignments from "@/lib/components/goal-assignments";
import { useCallback, useContext, useEffect, useState } from "react";
import {
	Alert,
	Button,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	InputAdornment,
	MenuItem,
	Tab,
	Tabs,
	TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { AuthContext } from "@/app/auth-context";
import financialService, {
	type FinancialGeneralGoal,
	type GoalsForMonth,
} from "@/lib/services/financial.service";
import { useFinancialContext } from "./financial-context";

const MONTHS = [
	"Janeiro", "Fevereiro", "Março", "Abril",
	"Maio", "Junho", "Julho", "Agosto",
	"Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function GoalsModal() {
	const { token, user } = useContext(AuthContext);
	const { instance } = useParams<{ instance: string }>();
	const { goalsOpen, setGoalsOpen, loadDashboard } = useFinancialContext();

	const [tab, setTab] = useState(0);
	const [saving, setSaving] = useState(false);

	// Shared date selectors
	const [year, setYear] = useState(new Date().getFullYear());
	const [month, setMonth] = useState(new Date().getMonth() + 1);

	// General goal form
	const [generalGoal, setGeneralGoal] = useState<FinancialGeneralGoal | null>(null);
	const [targetRevenue, setTargetRevenue] = useState("");
	const [targetSalesCount, setTargetSalesCount] = useState("");
	const [targetAvgTicket, setTargetAvgTicket] = useState("");

	const loadGoals = useCallback(async () => {
		if (!token) return;
		try {
			const res: GoalsForMonth = await financialService.getGoals(token, year, month);
			setGeneralGoal(res.general);
		} catch (err) {
			toast.error(sanitizeErrorMessage(err));
		}
	}, [token, year, month]);

	useEffect(() => {
		if (goalsOpen) loadGoals();
	}, [goalsOpen, loadGoals]);

	async function handleUpsertGeneral() {
		if (!token) return;
		setSaving(true);
		try {
			await financialService.upsertGeneralGoal(token, {
				year,
				month,
				...(targetRevenue !== "" && { targetRevenue: parseFloat(targetRevenue) }),
				...(targetSalesCount !== "" && { targetSalesCount: parseInt(targetSalesCount) }),
				...(targetAvgTicket !== "" && { targetAvgTicket: parseFloat(targetAvgTicket) }),
			});
			toast.success("Meta geral salva!");
			setTargetRevenue("");
			setTargetSalesCount("");
			setTargetAvgTicket("");
			await loadGoals();
			void loadDashboard();
		} catch (err) {
			toast.error(sanitizeErrorMessage(err));
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteGeneral(id: number) {
		if (!token) return;
		try {
			await financialService.deleteGeneralGoal(token, id);
			toast.success("Meta removida");
			await loadGoals();
			void loadDashboard();
		} catch (err) {
			toast.error(sanitizeErrorMessage(err));
		}
	}

	const currentYear = new Date().getFullYear();
	const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

	return (
		<Dialog open={goalsOpen} onClose={() => setGoalsOpen(false)} maxWidth="md" fullWidth>
			<DialogTitle className="flex items-center justify-between">
				<span className="text-base font-semibold">Gerenciar Metas</span>
				<IconButton size="small" onClick={() => setGoalsOpen(false)}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</DialogTitle>

			<DialogContent className="!pt-0">
				{user?.NIVEL !== "ADMIN" ? <Alert severity="warning">Cadastro restrito a supervisores administradores.</Alert> : <>
				<Tabs value={tab} onChange={(_, v) => setTab(v as number)} className="mb-4 border-b border-slate-200 dark:border-slate-700">
					<Tab label="Meta Geral" />
					<Tab label="Atribuir a participantes" />
				</Tabs>

				{/* Shared year/month row */}
				{tab === 0 && <div className="mb-4 flex gap-3">
					<TextField
						select
						label="Ano"
						size="small"
						value={year}
						onChange={(e) => setYear(parseInt(e.target.value))}
						className="w-28"
					>
						{yearOptions.map((y) => (
							<MenuItem key={y} value={y}>{y}</MenuItem>
						))}
					</TextField>
					<TextField
						select
						label="Mês"
						size="small"
						value={month}
						onChange={(e) => setMonth(parseInt(e.target.value))}
						className="w-36"
					>
						{MONTHS.map((m, i) => (
							<MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
						))}
					</TextField>
				</div>}

				{tab === 0 && (
					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-3 sm:flex-row">
							<TextField
								label="Meta de Faturamento (R$)"
								size="small"
								fullWidth
								type="number"
								value={targetRevenue}
								onChange={(e) => setTargetRevenue(e.target.value)}
								InputProps={{
									startAdornment: <InputAdornment position="start">R$</InputAdornment>,
								}}
							/>
							<TextField
								label="Meta de Vendas"
								size="small"
								fullWidth
								type="number"
								value={targetSalesCount}
								onChange={(e) => setTargetSalesCount(e.target.value)}
							/>
							<TextField
								label="Ticket Médio Alvo (R$)"
								size="small"
								fullWidth
								type="number"
								value={targetAvgTicket}
								onChange={(e) => setTargetAvgTicket(e.target.value)}
								InputProps={{
									startAdornment: <InputAdornment position="start">R$</InputAdornment>,
								}}
							/>
						</div>

						<Button
							variant="contained"
							size="small"
							disabled={saving || (!targetRevenue && !targetSalesCount && !targetAvgTicket)}
							onClick={handleUpsertGeneral}
							startIcon={saving ? <CircularProgress size={14} /> : undefined}
						>
							Salvar Meta
						</Button>

						{generalGoal && (
							<div className="mt-2">
								<p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
									Meta cadastrada
								</p>
								<div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700/30">
									<div className="flex flex-col gap-0.5">
										<span className="font-medium text-slate-700 dark:text-slate-300">
											{MONTHS[generalGoal.month - 1]!} {generalGoal.year}
										</span>
										<span className="text-xs text-slate-500 dark:text-slate-400">
											{generalGoal.targetRevenue != null && `Fat.: R$ ${generalGoal.targetRevenue.toFixed(2)}`}
											{generalGoal.targetSalesCount != null && ` · Vendas: ${generalGoal.targetSalesCount}`}
											{generalGoal.targetAvgTicket != null && ` · Ticket: R$ ${generalGoal.targetAvgTicket.toFixed(2)}`}
										</span>
									</div>
									<IconButton size="small" color="error" onClick={() => handleDeleteGeneral(generalGoal.id)}>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</div>
							</div>
						)}
					</div>
				)}

				{tab === 1 && token && <GoalAssignments key={`${instance}:${token}`} token={token} instance={instance} onSaved={() => { void loadDashboard(); }} />}

			</>}
			</DialogContent>
		</Dialog>
	);
}
