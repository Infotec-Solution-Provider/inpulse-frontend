"use client";

import {
	AI_MODEL_CATALOG,
	AI_MODEL_TIERS,
	ASSISTANT_MODEL_CATALOG,
	modelLabel,
	type AiModelOption,
} from "@/lib/ai-model-catalog";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { Tooltip } from "@mui/material";
import type { ReactNode } from "react";
import { Badge, formatDate, formatPrice } from "./presentation";

const ASSISTANT_VALUES = ASSISTANT_MODEL_CATALOG.map((model) => model.value);

function CheckMark({ checked }: { checked: boolean }) {
	return (
		<span
			aria-hidden
			className={[
				"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
				checked
					? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-900"
					: "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
			].join(" ")}
		>
			{checked && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
		</span>
	);
}

function cardClass(state: "checked" | "unchecked" | "static", layout: "card" | "chip" = "card"): string {
	return [
		layout === "card" ? "flex h-full w-full flex-col gap-2 p-3" : "flex items-center gap-2 px-3 py-2",
		"rounded-lg border text-left transition-colors",
		"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
		state === "checked"
			? "border-indigo-400 bg-indigo-50/70 dark:border-indigo-400/70 dark:bg-indigo-500/10"
			: state === "unchecked"
				? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
				: "border-dashed border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/60",
	].join(" ");
}

function ModelCardBody({ model, isDefault, leading }: { model: AiModelOption; isDefault: boolean; leading: ReactNode }) {
	return (
		<>
			<div className="flex w-full items-start gap-2.5">
				{leading}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{model.label}</span>
						{model.isNew && <Badge tone="indigo">Novo</Badge>}
						{isDefault && <Badge tone="emerald">Padrão</Badge>}
					</div>
					<p className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">{model.value}</p>
				</div>
			</div>

			<p className="text-xs leading-snug text-slate-600 dark:text-slate-400">{model.description}</p>

			{(model.deprecation || !model.assistant) && (
				<div className="flex flex-wrap gap-1.5">
					{model.deprecation && (
						<Tooltip
							title={`Descontinuado pela OpenAI. Sai da API em ${formatDate(model.deprecation.shutdownAt)}; o substituto indicado é o ${modelLabel(model.deprecation.replacement)}.`}
						>
							<span>
								<Badge tone="amber">Sai em {formatDate(model.deprecation.shutdownAt)}</Badge>
							</span>
						</Tooltip>
					)}
					{!model.assistant && (
						<Tooltip title="Só aceita ferramentas na Responses API da OpenAI, e o Assistente IA usa ferramentas. Escolha-o em “Modelo por funcionalidade” ou no cadastro de um agente.">
							<span>
								<Badge tone="slate">Copiloto e agentes</Badge>
							</span>
						</Tooltip>
					)}
				</div>
			)}

			<div className="mt-auto flex w-full items-baseline gap-3 border-t border-slate-100 pt-2 text-xs tabular-nums dark:border-slate-800">
				<span>
					<span className="font-medium text-slate-800 dark:text-slate-200">{formatPrice(model.pricing.input)}</span>{" "}
					<span className="text-slate-500 dark:text-slate-400">entrada</span>
				</span>
				<span>
					<span className="font-medium text-slate-800 dark:text-slate-200">{formatPrice(model.pricing.output)}</span>{" "}
					<span className="text-slate-500 dark:text-slate-400">saída</span>
				</span>
			</div>
		</>
	);
}

function ModelCard({
	model,
	checked,
	isDefault,
	onToggle,
}: {
	model: AiModelOption;
	checked: boolean;
	isDefault: boolean;
	onToggle: () => void;
}) {
	if (!model.assistant) {
		return (
			<div className={cardClass("static")}>
				<ModelCardBody
					model={model}
					isDefault={isDefault}
					leading={<span aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />}
				/>
			</div>
		);
	}

	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={checked}
			onClick={onToggle}
			className={cardClass(checked ? "checked" : "unchecked")}
		>
			<ModelCardBody model={model} isDefault={isDefault} leading={<CheckMark checked={checked} />} />
		</button>
	);
}

function TextButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="rounded px-1.5 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent dark:text-indigo-300 dark:hover:bg-indigo-500/10 dark:disabled:text-slate-600"
		>
			{children}
		</button>
	);
}

/**
 * Catálogo de modelos agrupado por geração, com preço e situação de cada um. A marcação
 * define o que os operadores podem escolher no Assistente IA.
 */
export default function ModelsPanel({
	selected,
	offCatalog,
	defaultModel,
	onChange,
}: {
	selected: string[];
	offCatalog: string[];
	defaultModel: string;
	onChange: (next: string[]) => void;
}) {
	const selectedSet = new Set(selected);

	function toggle(value: string) {
		onChange(selectedSet.has(value) ? selected.filter((item) => item !== value) : [...selected, value]);
	}

	function setGroup(values: string[], checked: boolean) {
		const rest = selected.filter((item) => !values.includes(item));
		onChange(checked ? [...rest, ...values] : rest);
	}

	return (
		<div className="grid gap-5">
			{selected.length === 0 && (
				<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
					Nenhum modelo marcado: ao salvar, todos ficam liberados no Assistente IA.
				</p>
			)}

			{AI_MODEL_TIERS.map((tier) => {
				const models = AI_MODEL_CATALOG.filter((model) => model.tier === tier.value);
				if (models.length === 0) return null;
				const selectable = models.filter((model) => model.assistant).map((model) => model.value);
				const checkedCount = selectable.filter((value) => selectedSet.has(value)).length;

				return (
					<div key={tier.value}>
						<div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
							<h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tier.label}</h3>
							<span className="text-xs text-slate-500 dark:text-slate-400">{tier.description}</span>
							{selectable.length > 0 && (
								<span className="ml-auto flex items-center gap-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
									{checkedCount} de {selectable.length}
									<TextButton onClick={() => setGroup(selectable, checkedCount < selectable.length)}>
										{checkedCount < selectable.length ? "Marcar grupo" : "Desmarcar grupo"}
									</TextButton>
								</span>
							)}
						</div>
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
							{models.map((model) => (
								<ModelCard
									key={model.value}
									model={model}
									checked={selectedSet.has(model.value)}
									isDefault={model.value === defaultModel}
									onToggle={() => toggle(model.value)}
								/>
							))}
						</div>
					</div>
				);
			})}

			{offCatalog.length > 0 && (
				<div>
					<div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Fora da lista do Assistente</h3>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							Liberados antes, mas fora da lista recomendada para o Assistente IA. Desmarque para revogar.
						</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{offCatalog.map((value) => {
							const checked = selectedSet.has(value);
							return (
								<button
									key={value}
									type="button"
									role="checkbox"
									aria-checked={checked}
									onClick={() => toggle(value)}
									className={cardClass(checked ? "checked" : "unchecked", "chip")}
								>
									<CheckMark checked={checked} />
									<span className="font-mono text-xs text-slate-700 dark:text-slate-300">{value}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

export function ModelsPanelActions({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
}) {
	const allChecked = ASSISTANT_VALUES.every((value) => selected.includes(value));
	return (
		<>
			<TextButton onClick={() => onChange([...new Set([...selected, ...ASSISTANT_VALUES])])} disabled={allChecked}>
				Marcar todos
			</TextButton>
			<TextButton onClick={() => onChange([])} disabled={selected.length === 0}>
				Desmarcar todos
			</TextButton>
		</>
	);
}
