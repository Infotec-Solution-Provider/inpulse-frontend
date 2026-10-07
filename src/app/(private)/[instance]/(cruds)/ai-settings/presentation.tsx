import type { ReactNode } from "react";
import { surface, surfaceBorder } from "../../monitor/surface";

/** Paper dos menus e popovers MUI na paleta slate da página (ver monitor/surface). */
export const menuPaperSx = {
	bgcolor: surface,
	backgroundImage: "none",
	border: 1,
	borderColor: surfaceBorder,
} as const;

export const selectMenuProps = { slotProps: { paper: { sx: menuPaperSx } } } as const;

export function SectionCard({
	icon,
	title,
	description,
	actions,
	children,
	className = "",
}: {
	icon: ReactNode;
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
		>
			<header className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-3">
				<div className="flex min-w-0 flex-[1_1_18rem] items-start gap-3">
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
						{icon}
					</span>
					<div className="min-w-0">
						<h2 className="text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">{title}</h2>
						{description && (
							<p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
						)}
					</div>
				</div>
				{actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
			</header>
			{children}
		</section>
	);
}

export function FieldLabel({ children }: { children: ReactNode }) {
	return (
		<span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
			{children}
		</span>
	);
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
	return (
		<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
			<FieldLabel>{label}</FieldLabel>
			<p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
			{sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
		</div>
	);
}

type BadgeTone = "indigo" | "emerald" | "amber" | "slate";

const BADGE_TONES: Record<BadgeTone, string> = {
	indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
	emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
	amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
	slate: "bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
	return (
		<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone]}`}>
			{children}
		</span>
	);
}

/** Barra de progresso do gasto: indigo, âmbar a partir de 70% e vermelha a partir de 90%. */
export function BudgetBar({ percent }: { percent: number }) {
	const clamped = Math.max(0, Math.min(100, percent));
	const tone = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-indigo-500 dark:bg-indigo-400";
	return (
		<div
			className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(clamped)}
		>
			<div className={`h-full rounded-full transition-[width] ${tone}`} style={{ width: `${clamped}%` }} />
		</div>
	);
}

// ─── Formatação ───────────────────────────────────────────────────────────────

/** US$ no formato brasileiro; abaixo de US$ 1 vão até 4 casas para o custo pequeno não virar zero. */
export function formatUsd(value: number): string {
	return value.toLocaleString("pt-BR", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
	});
}

/** Preço por 1M tokens: duas casas, como na tabela da OpenAI. */
export function formatPrice(value: number): string {
	return value.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export function formatTokens(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
	if (value >= 1_000) return `${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
	return value.toLocaleString("pt-BR");
}

export function formatDate(iso: string): string {
	const [year, month, day] = iso.split("-");
	return year && month && day ? `${day}/${month}/${year}` : iso;
}
