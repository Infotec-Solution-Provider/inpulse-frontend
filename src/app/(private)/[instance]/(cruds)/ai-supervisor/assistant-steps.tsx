"use client";

import type { SupervisorAiMessageStep, SupervisorAiStepKind, SupervisorAiStepStatus } from "@/lib/types/sdk-local.types";
import {
	formatElapsed,
	formatStepDuration,
	liveStepDurationMs,
	liveStepsElapsedMs,
	liveStepsHeadline,
	stepCountLabel,
	type LiveSupervisorStep,
} from "@/lib/utils/supervisor-steps";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";

function StepStatusIcon({ status }: { status: SupervisorAiStepStatus }) {
	if (status === "running") {
		return (
			<span className="flex text-indigo-500 dark:text-indigo-400">
				<CircularProgress size={12} thickness={5} color="inherit" aria-label="Em andamento" />
			</span>
		);
	}
	if (status === "error") {
		return <ErrorOutlineRoundedIcon titleAccess="Não foi possível concluir esta etapa" sx={{ fontSize: 15 }} className="text-amber-500 dark:text-amber-400" />;
	}
	return <CheckCircleRoundedIcon titleAccess="Concluída" sx={{ fontSize: 15 }} className="text-emerald-500 dark:text-emerald-400" />;
}

function StepRow({ kind, label, status, time }: { kind: SupervisorAiStepKind; label: string; status: SupervisorAiStepStatus; time: string }) {
	const labelClass = status === "running"
		? "font-medium text-slate-800 dark:text-slate-100"
		: kind === "thinking"
			? "text-slate-500 dark:text-slate-400"
			: "text-slate-700 dark:text-slate-300";
	return (
		<li className="flex items-center gap-2 text-xs leading-5">
			<span className="flex h-4 w-4 shrink-0 items-center justify-center">
				<StepStatusIcon status={status} />
			</span>
			<span className={`min-w-0 flex-1 truncate ${labelClass}`}>
				{label}
				{status === "running" ? "…" : ""}
			</span>
			{time && (
				<span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500" aria-hidden={status === "running"}>
					{time}
				</span>
			)}
		</li>
	);
}

function useTicker(active: boolean): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active) return;
		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(timer);
	}, [active]);
	return now;
}

/**
 * Etapas da resposta em andamento: lista completa enquanto não há texto e,
 * quando o texto começa a chegar, uma linha-resumo recolhida acima dele.
 */
export function LiveSteps({ steps, hasText }: { steps: LiveSupervisorStep[]; hasText: boolean }) {
	const [expanded, setExpanded] = useState(false);
	const hasRunning = steps.some((step) => step.status === "running");
	const now = useTicker(hasRunning);

	if (steps.length === 0) {
		if (hasText) return null;
		return (
			<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
				<StepStatusIcon status="running" />
				<span>Preparando a resposta…</span>
			</div>
		);
	}

	const headline = liveStepsHeadline(steps, hasText);
	const elapsed = headline.running ? formatElapsed(liveStepsElapsedMs(steps, now)) : formatStepDuration(liveStepsElapsedMs(steps, now));

	if (hasText && !expanded) {
		return (
			<button
				type="button"
				onClick={() => setExpanded(true)}
				aria-expanded={false}
				title="Ver etapas"
				className="mb-3 flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<StepStatusIcon status={headline.running ? "running" : "done"} />
				<span className="min-w-0 truncate">{headline.label}{headline.running ? "…" : ""}</span>
				{elapsed && <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500" aria-hidden>{elapsed}</span>}
				<ExpandMoreRoundedIcon sx={{ fontSize: 16 }} className="shrink-0 text-slate-400" />
			</button>
		);
	}

	return (
		<div className={hasText
			? "mb-3 min-w-[260px] rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40"
			: "min-w-[260px] py-0.5"}
		>
			{hasText && (
				<button
					type="button"
					onClick={() => setExpanded(false)}
					aria-expanded
					className="mb-1 flex w-full items-center justify-between gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
				>
					<span>Etapas</span>
					<ExpandMoreRoundedIcon sx={{ fontSize: 16, transform: "rotate(180deg)" }} />
				</button>
			)}
			<ol className="space-y-1">
				{steps.map((step) => (
					<StepRow
						key={step.id}
						kind={step.kind}
						label={step.label}
						status={step.status}
						time={step.status === "running"
							? formatElapsed(liveStepDurationMs(step, now))
							: formatStepDuration(liveStepDurationMs(step, now))}
					/>
				))}
			</ol>
		</div>
	);
}

/** Expansor recolhido, abaixo da resposta concluída, com as consultas que levaram a ela. */
export function ResponseSteps({ steps }: { steps: SupervisorAiMessageStep[] }) {
	const [open, setOpen] = useState(false);
	if (steps.length === 0) return null;

	return (
		<div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
			>
				<ExpandMoreRoundedIcon
					sx={{ fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}
				/>
				Como cheguei nesta resposta ({stepCountLabel(steps.length)})
			</button>
			{open && (
				<ol className="mt-2 space-y-1 pl-1">
					{steps.map((step, index) => (
						<StepRow
							key={`${index}-${step.label}`}
							kind={step.kind}
							label={step.label}
							status={step.status === "error" ? "error" : "done"}
							time={typeof step.durationMs === "number" ? formatStepDuration(step.durationMs) : ""}
						/>
					))}
				</ol>
			)}
		</div>
	);
}
