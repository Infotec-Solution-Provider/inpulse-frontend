"use client";

import { useAuthContext } from "@/app/auth-context";
import { AI_MODEL_CATALOG } from "@/lib/ai-model-catalog";
import aiService from "@/lib/services/ai.service";
import usersService from "@/lib/services/users.service";
import type {
	AiFeatureModels,
	AiOperatorUsageStat,
	AiTenantConfig,
	AiUsageSummary,
} from "@/lib/types/sdk-local.types";
import { User, UserRole } from "@/lib/sdk-local";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import TuneIcon from "@mui/icons-material/Tune";
import {
	Alert,
	Button,
	CircularProgress,
	FormControl,
	InputAdornment,
	InputLabel,
	LinearProgress,
	MenuItem,
	Select,
	Skeleton,
	TextField,
	Tooltip,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip as ChartTooltip,
	XAxis,
	YAxis,
} from "recharts";

// Catálogo compartilhado entre configurações, Assistente IA e agentes.

const KNOWN_MODELS = AI_MODEL_CATALOG;

const TIER_LABELS: Record<string, string> = {
	gpt56:     "GPT-5.6",
	flagship:  "Flagship",
	mini:      "Mini / Nano",
	reasoning: "Raciocínio",
	legacy:    "Geração anterior",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<keyof AiFeatureModels, string> = {
	suggest_response: "Sugerir Resposta",
	summarize_chat:   "Resumir Conversa",
	analyze_customer: "Analisar Cliente",
	supervisor_chat:  "Assistente IA",
};

const PERIOD_OPTIONS = [
	{ value: "current_month", label: "Mês atual" },
	{ value: "last_30d",      label: "Últimos 30 dias" },
	{ value: "all",           label: "Todo o período" },
];

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
	return value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 });
}

function formatTokens(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
	return String(value);
}

// ─── Visual building blocks ───────────────────────────────────────────────────

function SectionCard({
	icon,
	title,
	description,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
			<header className="mb-5 flex items-start gap-3">
				<span className="rounded-md bg-slate-100 p-2 dark:bg-slate-800">{icon}</span>
				<div>
					<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
					{description && (
						<p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
					)}
				</div>
			</header>
			{children}
		</section>
	);
}

function Label({ children }: { children: React.ReactNode }) {
	return (
		<span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
			{children}
		</span>
	);
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
	return (
		<div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
			<Label>{label}</Label>
			<p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
			{sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
		</div>
	);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiSettingsPage() {
	const { token, user, instance } = useAuthContext();
	const userLevel = String(user?.NIVEL ?? "");
	const isAdmin = userLevel === UserRole.ADMIN;

	// ── Config state ────────────────────────────────────────────────────────────
	const [config, setConfig] = useState<AiTenantConfig | null>(null);
	const [loadingConfig, setLoadingConfig] = useState(true);
	const [savingConfig, setSavingConfig] = useState(false);

	const [budgetInput, setBudgetInput] = useState("");
	const [selectedModels, setSelectedModels] = useState<string[]>([]);
	const [featureModels, setFeatureModels] = useState<AiFeatureModels>({});

	// Per-operator budgets: Record<operatorId, budgetUsd as string>
	const [operatorBudgetInputs, setOperatorBudgetInputs] = useState<Record<string, string>>({});

	// ── Usage state ─────────────────────────────────────────────────────────────
	const [period, setPeriod] = useState("current_month");
	const [usage, setUsage] = useState<AiUsageSummary | null>(null);
	const [loadingUsage, setLoadingUsage] = useState(false);

	// Usage view tab
	const [usageTab, setUsageTab] = useState<"feature" | "operator">("feature");

	// Operators (for budget select)
	const [operators, setOperators] = useState<User[]>([]);

	// ── Load config ─────────────────────────────────────────────────────────────
	useEffect(() => {
		if (typeof token !== "string" || !instance) return;
		const authToken = token;
		const inst = instance;

		async function load() {
			try {
				setLoadingConfig(true);
				const c = await aiService.getTenantConfig(inst, authToken);
				setConfig(c);
				setBudgetInput(c.monthlyBudgetUsd != null ? String(c.monthlyBudgetUsd) : "");
				setSelectedModels(c.availableModels ?? KNOWN_MODELS.map((m) => m.value));
				setFeatureModels(c.featureModels ?? {});

				// Populate operator budget inputs
				const budgets = c.operatorBudgets as Record<string, number> | null | undefined;
				if (budgets && typeof budgets === "object") {
					const inputs: Record<string, string> = {};
					for (const [id, val] of Object.entries(budgets)) {
						inputs[id] = String(val);
					}
					setOperatorBudgetInputs(inputs);
				}
			} catch (error) {
				toast.error(`Falha ao carregar configurações: ${sanitizeErrorMessage(error)}`);
			} finally {
				setLoadingConfig(false);
			}
		}

		void load();
	}, [token, instance]);

	// ── Load usage ──────────────────────────────────────────────────────────────
	useEffect(() => {
		if (typeof token !== "string") return;
		const authToken = token;

		async function load() {
			try {
				setLoadingUsage(true);
				const data = await aiService.getUsageSummary(period, authToken);
				setUsage(data);
			} catch (error) {
				toast.error(`Falha ao carregar uso: ${sanitizeErrorMessage(error)}`);
			} finally {
				setLoadingUsage(false);
			}
		}

		void load();
	}, [token, period]);

	// ── Load operators ──────────────────────────────────────────────────────────
	useEffect(() => {
		if (typeof token !== "string") return;
		usersService
			.getUsers({ perPage: "500" })
			.then(({ data }) => setOperators(data))
			.catch(() => {});
	}, [token]);

	// ── Handlers ────────────────────────────────────────────────────────────────
	function toggleModel(value: string) {
		setSelectedModels((current) =>
			current.includes(value) ? current.filter((m) => m !== value) : [...current, value],
		);
	}

	function setOperatorBudget(operatorId: string, value: string) {
		setOperatorBudgetInputs((prev) => {
			if (value === "") {
				const next = { ...prev };
				delete next[operatorId];
				return next;
			}
			return { ...prev, [operatorId]: value };
		});
	}

	async function handleSaveConfig() {
		if (typeof token !== "string" || !instance) return;

		const parsedBudget = budgetInput.trim() === "" ? null : Number(budgetInput);
		if (budgetInput.trim() !== "" && (isNaN(parsedBudget!) || parsedBudget! <= 0)) {
			toast.error("Orçamento inválido. Informe um número positivo ou deixe em branco para ilimitado.");
			return;
		}

		// Parse per-operator budgets
		const parsedOperatorBudgets: Record<string, number> = {};
		for (const [id, raw] of Object.entries(operatorBudgetInputs)) {
			const n = Number(raw);
			if (!isNaN(n) && n > 0) {
				parsedOperatorBudgets[id] = n;
			}
		}

		const allSelected = selectedModels.length === KNOWN_MODELS.length;

		try {
			setSavingConfig(true);
			const updated = await aiService.upsertTenantConfig(
				instance,
				{
					monthlyBudgetUsd: parsedBudget,
					availableModels: allSelected ? null : selectedModels,
					featureModels: Object.keys(featureModels).length === 0 ? null : featureModels,
					operatorBudgets: Object.keys(parsedOperatorBudgets).length === 0 ? null : parsedOperatorBudgets,
				},
				token,
			);
			setConfig(updated);
			toast.success("Configurações salvas com sucesso.");
		} catch (error) {
			toast.error(`Falha ao salvar: ${sanitizeErrorMessage(error)}`);
		} finally {
			setSavingConfig(false);
		}
	}

	// ── Guard ────────────────────────────────────────────────────────────────────
	if (!isAdmin) {
		return (
			<div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
				<Alert severity="warning">Acesso restrito a administradores.</Alert>
			</div>
		);
	}

	// ── Computed values ──────────────────────────────────────────────────────────
	const budgetValue = budgetInput.trim() === "" ? null : Number(budgetInput);
	const currentMonthCost = period === "current_month" ? (usage?.estimatedCostUsd ?? null) : null;
	const budgetPercent =
		budgetValue != null && budgetValue > 0 && currentMonthCost != null
			? Math.min(100, (currentMonthCost / budgetValue) * 100)
			: null;

	// Per-operator usage enriched with budget info
	const getOperatorName = (id: number) => {
		const op = operators.find((o) => o.CODIGO === id);
		return op ? `${op.NOME} (#${id})` : `#${id}`;
	};
	const operatorUsageRows: Array<AiOperatorUsageStat & { budgetUsd: number | null; budgetPercent: number | null }> =
		(usage?.byOperator ?? []).map((op) => {
			const key = String(op.operatorId);
			const budgetRaw = operatorBudgetInputs[key];
			const budgetUsd = budgetRaw != null && budgetRaw !== "" ? Number(budgetRaw) : null;
			const bPct =
				budgetUsd != null && budgetUsd > 0
					? Math.min(100, (op.estimatedCostUsd / budgetUsd) * 100)
					: null;
			return { ...op, budgetUsd, budgetPercent: bPct };
		});

	// Group models by tier for display
	const modelsByTier = KNOWN_MODELS.reduce<Record<string, typeof KNOWN_MODELS>>(
		(acc, m) => ({ ...acc, [m.tier]: [...(acc[m.tier] ?? []), m] }),
		{},
	);

	return (
		<div className="box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
			<div className="mx-auto grid w-full max-w-[1480px] gap-6">

				{/* ── Page header ───────────────────────────────────────────────── */}
				<div>
					<h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Configurações de IA</h1>
					<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
						Gerencie modelos, orçamentos e visualize o consumo de IA por funcionalidade e operador.
					</p>
				</div>

				{loadingConfig ? (
					<>
						<Skeleton variant="rectangular" height={140} className="rounded-md" />
						<Skeleton variant="rectangular" height={240} className="rounded-md" />
						<Skeleton variant="rectangular" height={180} className="rounded-md" />
					</>
				) : (
					<>
						{/* ── Section: Budget ───────────────────────────────────── */}
						<SectionCard
							icon={<AttachMoneyIcon className="text-slate-500 dark:text-slate-400" fontSize="small" />}
							title="Orçamento mensal"
							description="Defina um limite de gasto em USD para o mês corrente. Deixe em branco para uso ilimitado."
						>
							<div className="flex flex-col gap-5">
								<div className="max-w-xs">
									<TextField
										label="Limite mensal"
										type="number"
										size="small"
										fullWidth
										value={budgetInput}
										onChange={(e) => setBudgetInput(e.target.value)}
										placeholder="Ilimitado"
										inputProps={{ min: 0, step: 0.01 }}
										InputProps={{
											startAdornment: <InputAdornment position="start">$</InputAdornment>,
										}}
									/>
								</div>

								{budgetPercent !== null && (
									<div className="max-w-sm">
										<p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
											Uso no mês atual:{" "}
											<strong className="text-slate-900 dark:text-slate-100">
												{formatUsd(currentMonthCost!)}
											</strong>{" "}
											de{" "}
											<strong className="text-slate-900 dark:text-slate-100">
												{formatUsd(budgetValue!)}
											</strong>{" "}
											<span className={budgetPercent >= 90 ? "text-red-600" : "text-slate-500"}>
												({budgetPercent.toFixed(1)}%)
											</span>
										</p>
										<LinearProgress
											variant="determinate"
											value={budgetPercent}
											color={budgetPercent >= 90 ? "error" : budgetPercent >= 70 ? "warning" : "primary"}
											sx={{ height: 8, borderRadius: 4 }}
										/>
									</div>
								)}
							</div>
						</SectionCard>

						{/* ── Section: Available Models ─────────────────────────── */}
						<SectionCard
							icon={<ModelTrainingIcon className="text-slate-500 dark:text-slate-400" fontSize="small" />}
							title="Modelos disponíveis"
							description="Selecione os modelos que os operadores podem usar no Assistente IA. Sem seleção = todos liberados."
						>
							<div className="grid gap-5">
								{Object.entries(modelsByTier).map(([tier, models]) => (
									<div key={tier}>
										<Label>{TIER_LABELS[tier] ?? tier}</Label>
										<div className="mt-2 flex flex-wrap gap-2">
											{models.map((m) => {
												const checked = selectedModels.includes(m.value);
												return (
													<button
														key={m.value}
														type="button"
														onClick={() => toggleModel(m.value)}
														className={[
															"rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
															checked
																? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-300"
																: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
														].join(" ")}
													>
														{m.label}
													</button>
												);
											})}
										</div>
									</div>
								))}
							</div>
						</SectionCard>

						{/* ── Section: Per-feature Models ───────────────────────── */}
						<SectionCard
							icon={<TuneIcon className="text-slate-500 dark:text-slate-400" fontSize="small" />}
							title="Modelo por funcionalidade"
							description="Sobrescreve o modelo padrão do tenant para cada funcionalidade específica."
						>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{(Object.keys(FEATURE_LABELS) as (keyof AiFeatureModels)[]).map((key) => (
									<FormControl key={key} size="small" fullWidth>
										<InputLabel>{FEATURE_LABELS[key]}</InputLabel>
										<Select
											label={FEATURE_LABELS[key]}
											value={featureModels[key] ?? ""}
											onChange={(e) =>
												setFeatureModels((prev) => ({
													...prev,
													[key]: e.target.value === "" ? undefined : e.target.value,
												}))
											}
										>
											<MenuItem value="">
												<em>Padrão do tenant</em>
											</MenuItem>
											{KNOWN_MODELS.map((m) => (
												<MenuItem key={m.value} value={m.value}>
													{m.label}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								))}
							</div>
						</SectionCard>

						{/* ── Section: Per-operator budgets ─────────────────────── */}
						<SectionCard
							icon={<PeopleAltIcon className="text-slate-500 dark:text-slate-400" fontSize="small" />}
							title="Orçamento por operador"
							description="Defina limites mensais individuais de gasto em USD por operador."
						>
							<div className="space-y-4">
								<div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
									<Label>Operadores com limite definido</Label>
									<div className="mt-3 flex flex-col gap-3">
										{Object.keys(operatorBudgetInputs).length === 0 ? (
											<p className="text-sm text-slate-500 dark:text-slate-400">
												Nenhum limite por operador configurado.
											</p>
										) : (
											Object.entries(operatorBudgetInputs).map(([opId, val]) => (
												<div key={opId} className="flex items-center gap-3">
													<span className="min-w-40 text-sm font-medium text-slate-700 dark:text-slate-300">
														{getOperatorName(Number(opId))}
													</span>
													<TextField
														size="small"
														type="number"
														value={val}
														onChange={(e) => setOperatorBudget(opId, e.target.value)}
														placeholder="USD/mês"
														inputProps={{ min: 0, step: 0.01 }}
														InputProps={{
															startAdornment: <InputAdornment position="start">$</InputAdornment>,
														}}
														sx={{ maxWidth: 180 }}
													/>
													<button
														type="button"
														onClick={() => setOperatorBudget(opId, "")}
														className="text-xs text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
													>
														Remover
													</button>
												</div>
											))
										)}
									</div>
								</div>

								<AddOperatorBudgetRow onAdd={setOperatorBudget} operators={operators} />
							</div>
						</SectionCard>

						{/* Save button */}
						<div className="flex justify-end">
							<Button
								variant="contained"
								onClick={handleSaveConfig}
								disabled={savingConfig}
								startIcon={savingConfig ? <CircularProgress size={16} color="inherit" /> : undefined}
								sx={{ px: 4 }}
							>
								Salvar configurações
							</Button>
						</div>
					</>
				)}

				{/* ── Divider ───────────────────────────────────────────────────── */}
				<hr className="border-slate-200 dark:border-slate-700" />

				{/* ── Section: Usage ────────────────────────────────────────────── */}
				<SectionCard
					icon={<QueryStatsIcon className="text-slate-500 dark:text-slate-400" fontSize="small" />}
					title="Consumo de IA"
					description="Tokens consumidos e custo estimado por funcionalidade e por operador."
				>
					{/* Controls */}
					<div className="mb-5 flex flex-wrap items-center justify-between gap-4">
						{/* Tab switcher */}
						<div className="flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
							{(["feature", "operator"] as const).map((tab) => (
								<button
									key={tab}
									type="button"
									onClick={() => setUsageTab(tab)}
									className={[
										"px-4 py-1.5 text-sm font-medium transition-colors",
										usageTab === tab
											? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
											: "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800",
									].join(" ")}
								>
									{tab === "feature" ? "Por funcionalidade" : "Por operador"}
								</button>
							))}
						</div>

						<FormControl size="small" sx={{ minWidth: 180 }}>
							<InputLabel>Período</InputLabel>
							<Select
								label="Período"
								value={period}
								onChange={(e) => setPeriod(e.target.value)}
							>
								{PERIOD_OPTIONS.map(({ value, label }) => (
									<MenuItem key={value} value={value}>
										{label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</div>

					{loadingUsage ? (
						<div className="flex items-center justify-center py-16">
							<CircularProgress />
						</div>
					) : usage ? (
						<div className="space-y-6">
							{/* Summary stat cards */}
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<StatCard
									label="Tokens de entrada"
									value={formatTokens(usage.totalInputTokens)}
								/>
								<StatCard
									label="Tokens de saída"
									value={formatTokens(usage.totalOutputTokens)}
								/>
								<StatCard
									label="Custo estimado"
									value={formatUsd(usage.estimatedCostUsd)}
									sub="Estimativa baseada nos preços da OpenAI"
								/>
							</div>

							{/* ── Feature view ───────────────────────────────────── */}
							{usageTab === "feature" && (
								<>
									{usage.byFeature.length > 0 ? (
										<>
											<Label>Custo por funcionalidade (USD)</Label>
											<ResponsiveContainer width="100%" height={200} className="mt-2">
												<BarChart data={usage.byFeature} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
													<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
													<XAxis dataKey="feature" tick={{ fontSize: 12 }} />
													<YAxis
														tickFormatter={(v: number) => `$${v.toFixed(4)}`}
														tick={{ fontSize: 11 }}
														width={76}
													/>
													<ChartTooltip
														formatter={(v: unknown) => [
															typeof v === "number" ? formatUsd(v) : String(v),
															"Custo estimado",
														]}
													/>
													<Bar dataKey="estimatedCostUsd" radius={[4, 4, 0, 0]}>
														{usage.byFeature.map((_, idx) => (
															<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
														))}
													</Bar>
												</BarChart>
											</ResponsiveContainer>

											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead>
														<tr className="border-b border-slate-200 dark:border-slate-700">
															<th className="pb-2 text-left"><Label>Funcionalidade</Label></th>
															<th className="pb-2 text-right"><Label>Chamadas</Label></th>
															<th className="pb-2 text-right"><Label>Tokens entrada</Label></th>
															<th className="pb-2 text-right"><Label>Tokens saída</Label></th>
															<th className="pb-2 text-right"><Label>Custo estimado</Label></th>
														</tr>
													</thead>
													<tbody>
														{usage.byFeature.map((row) => (
															<tr
																key={row.feature}
																className="border-b border-slate-100 dark:border-slate-800"
															>
																<td className="py-2 text-slate-900 dark:text-slate-100">{row.feature}</td>
																<td className="py-2 text-right text-slate-700 dark:text-slate-300">{row.callCount}</td>
																<td className="py-2 text-right text-slate-700 dark:text-slate-300">{formatTokens(row.inputTokens)}</td>
																<td className="py-2 text-right text-slate-700 dark:text-slate-300">{formatTokens(row.outputTokens)}</td>
																<td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">{formatUsd(row.estimatedCostUsd)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</>
									) : (
										<p className="text-sm text-slate-500 dark:text-slate-400">
											Nenhum dado de uso disponível para o período selecionado.
										</p>
									)}
								</>
							)}

							{/* ── Operator view ──────────────────────────────────── */}
							{usageTab === "operator" && (
								<>
									{operatorUsageRows.length > 0 ? (
										<>
											<Label>Custo por operador (USD)</Label>
											<ResponsiveContainer width="100%" height={200} className="mt-2">
												<BarChart
													data={operatorUsageRows.map((r) => ({
														name: getOperatorName(r.operatorId),
														estimatedCostUsd: r.estimatedCostUsd,
													}))}
													margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
												>
													<CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
													<XAxis dataKey="name" tick={{ fontSize: 12 }} />
													<YAxis
														tickFormatter={(v: number) => `$${v.toFixed(4)}`}
														tick={{ fontSize: 11 }}
														width={76}
													/>
													<ChartTooltip
														formatter={(v: unknown) => [
															typeof v === "number" ? formatUsd(v) : String(v),
															"Custo estimado",
														]}
													/>
													<Bar dataKey="estimatedCostUsd" radius={[4, 4, 0, 0]}>
														{operatorUsageRows.map((_, idx) => (
															<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
														))}
													</Bar>
												</BarChart>
											</ResponsiveContainer>

											<div className="overflow-x-auto">
												<table className="w-full text-sm">
													<thead>
														<tr className="border-b border-slate-200 dark:border-slate-700">
															<th className="pb-2 text-left"><Label>Operador</Label></th>
															<th className="pb-2 text-right"><Label>Chamadas</Label></th>
															<th className="pb-2 text-right"><Label>Tokens entrada</Label></th>
															<th className="pb-2 text-right"><Label>Tokens saída</Label></th>
															<th className="pb-2 text-right"><Label>Custo estimado</Label></th>
															<th className="pb-2 text-right"><Label>Orçamento</Label></th>
															<th className="pb-2 text-right"><Label>% do limite</Label></th>
														</tr>
													</thead>
													<tbody>
														{operatorUsageRows.map((row) => (
															<tr
																key={row.operatorId}
																className="border-b border-slate-100 dark:border-slate-800"
															>
																<td className="py-2 text-slate-900 dark:text-slate-100">{getOperatorName(row.operatorId)}</td>
																<td className="py-2 text-right text-slate-700 dark:text-slate-300">{row.callCount}</td>
																<td className="py-2 text-right text-slate-700 dark:text-slate-300">{formatTokens(row.inputTokens)}</td>
																<td className="py-2 text-right text-slate-700 dark:text-slate-300">{formatTokens(row.outputTokens)}</td>
																<td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">
																	{formatUsd(row.estimatedCostUsd)}
																</td>
																<td className="py-2 text-right text-slate-500 dark:text-slate-400">
																	{row.budgetUsd != null ? formatUsd(row.budgetUsd) : "—"}
																</td>
																<td className="py-2 text-right">
																	{row.budgetPercent != null ? (
																		<span
																			className={
																				row.budgetPercent >= 90
																					? "font-semibold text-red-600 dark:text-red-400"
																					: row.budgetPercent >= 70
																					? "font-semibold text-yellow-600 dark:text-yellow-400"
																					: "text-slate-700 dark:text-slate-300"
																			}
																		>
																			{row.budgetPercent.toFixed(1)}%
																		</span>
																	) : (
																		<span className="text-slate-400">—</span>
																	)}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</>
									) : (
										<p className="text-sm text-slate-500 dark:text-slate-400">
											Nenhum dado de uso por operador disponível para o período selecionado.
											<br />
											<span className="mt-1 block text-xs">
												Os logs por operador são gerados pelas funcionalidades de IA usadas pelos operadores
												(sugerir resposta, resumir conversa, analisar cliente, assistente IA).
											</span>
										</p>
									)}
								</>
							)}
						</div>
					) : (
						<p className="text-sm text-slate-500 dark:text-slate-400">Nenhum dado disponível.</p>
					)}
				</SectionCard>
			</div>
		</div>
	);
}

// ─── Add operator budget row ──────────────────────────────────────────────────

function AddOperatorBudgetRow({
	onAdd,
	operators,
}: {
	onAdd: (id: string, val: string) => void;
	operators: User[];
}) {
	const [selectedId, setSelectedId] = useState("");
	const [valInput, setValInput] = useState("");

	function handleAdd() {
		const n = Number(valInput);
		if (!selectedId || isNaN(n) || n <= 0) {
			toast.error("Selecione um operador e informe um valor positivo.");
			return;
		}
		onAdd(selectedId, valInput);
		setSelectedId("");
		setValInput("");
	}

	return (
		<div className="flex flex-wrap items-end gap-3 pt-1">
			<FormControl size="small" sx={{ minWidth: 220 }}>
				<InputLabel>Operador</InputLabel>
				<Select
					label="Operador"
					value={selectedId}
					onChange={(e) => setSelectedId(String(e.target.value))}
				>
					{operators.length === 0 ? (
						<MenuItem disabled value="">
							Carregando…
						</MenuItem>
					) : (
						operators.map((op) => (
							<MenuItem key={op.CODIGO} value={String(op.CODIGO)}>
								{op.NOME} (#{op.CODIGO})
							</MenuItem>
						))
					)}
				</Select>
			</FormControl>
			<TextField
				size="small"
				label="Limite (USD/mês)"
				type="number"
				value={valInput}
				onChange={(e) => setValInput(e.target.value)}
				inputProps={{ min: 0, step: 0.01 }}
				InputProps={{
					startAdornment: <InputAdornment position="start">$</InputAdornment>,
				}}
				sx={{ maxWidth: 180 }}
			/>
			<Tooltip title="Adicionar limite para este operador">
				<Button variant="outlined" size="small" onClick={handleAdd}>
					Adicionar
				</Button>
			</Tooltip>
		</div>
	);
}
