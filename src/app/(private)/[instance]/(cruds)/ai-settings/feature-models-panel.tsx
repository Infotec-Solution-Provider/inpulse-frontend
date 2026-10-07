"use client";

import {
	AI_MODEL_CATALOG,
	AI_MODEL_TIERS,
	findCatalogModel,
	modelLabel,
	modelSupportsAssistant,
} from "@/lib/ai-model-catalog";
import type { AiFeatureModels } from "@/lib/types/sdk-local.types";
import { Alert, ListSubheader, MenuItem, TextField } from "@mui/material";
import type { ReactNode } from "react";
import { FEATURE_KEYS } from "./settings-form";
import { formatPrice, selectMenuProps } from "./presentation";

const FEATURES: Record<keyof AiFeatureModels, { label: string; hint: string }> = {
	suggest_response: { label: "Sugerir resposta", hint: "Copiloto do atendimento" },
	summarize_chat: { label: "Resumir conversa", hint: "Copiloto do atendimento" },
	analyze_customer: { label: "Analisar cliente", hint: "Copiloto do atendimento" },
	supervisor_chat: { label: "Assistente IA", hint: "Usa ferramentas do CRM" },
};

const INHERIT = "__inherit__";

function ModelOption({ label, price, note }: { label: string; price?: string; note?: string }) {
	return (
		<span className="flex w-full items-center justify-between gap-4">
			<span>{label}</span>
			<span className="text-xs tabular-nums text-slate-400">{note ?? price}</span>
		</span>
	);
}

/** Itens do select agrupados por geração; no Assistente, os modelos sem ferramentas ficam desabilitados. */
function modelMenuItems({ forAssistant, current }: { forAssistant: boolean; current: string }): ReactNode[] {
	const items: ReactNode[] = [];

	if (current && current !== INHERIT && !findCatalogModel(current)) {
		items.push(
			<MenuItem key={`off-${current}`} value={current}>
				<ModelOption label={current} note="fora do catálogo" />
			</MenuItem>,
		);
	}

	for (const tier of AI_MODEL_TIERS) {
		const models = AI_MODEL_CATALOG.filter((model) => model.tier === tier.value);
		if (models.length === 0) continue;
		items.push(
			<ListSubheader key={`tier-${tier.value}`} sx={{ bgcolor: "inherit", lineHeight: "32px", fontSize: 12 }}>
				{tier.label}
			</ListSubheader>,
		);
		for (const model of models) {
			const blocked = forAssistant && !model.assistant;
			items.push(
				<MenuItem key={model.value} value={model.value} disabled={blocked}>
					<ModelOption
						label={model.label}
						price={`${formatPrice(model.pricing.input)} / ${formatPrice(model.pricing.output)}`}
						{...(blocked ? { note: "sem ferramentas" } : {})}
					/>
				</MenuItem>,
			);
		}
	}

	return items;
}

/** Modelo padrão da empresa e as substituições por funcionalidade. */
export default function FeatureModelsPanel({
	defaultModel,
	featureModels,
	onDefaultModelChange,
	onFeatureModelChange,
}: {
	defaultModel: string;
	featureModels: AiFeatureModels;
	onDefaultModelChange: (value: string) => void;
	onFeatureModelChange: (feature: keyof AiFeatureModels, value: string | undefined) => void;
}) {
	const assistantModel = featureModels.supervisor_chat || defaultModel;
	const assistantBlocked = !modelSupportsAssistant(assistantModel);

	return (
		<div className="grid gap-4">
			<div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center">
				<TextField
					select
					size="small"
					label="Modelo padrão da empresa"
					value={defaultModel}
					onChange={(event) => onDefaultModelChange(event.target.value)}
					slotProps={{ select: { MenuProps: selectMenuProps, renderValue: (value) => modelLabel(String(value)) } }}
				>
					{modelMenuItems({ forAssistant: false, current: defaultModel })}
				</TextField>
				<p className="text-sm text-slate-500 dark:text-slate-400">
					Usado em toda funcionalidade sem modelo próprio abaixo. Os agentes de IA escolhem o modelo no cadastro de cada agente.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{FEATURE_KEYS.map((key) => {
					const value = featureModels[key] ?? INHERIT;
					const forAssistant = key === "supervisor_chat";
					const invalid = forAssistant && value !== INHERIT && !modelSupportsAssistant(value);
					return (
						<TextField
							key={key}
							select
							size="small"
							label={FEATURES[key].label}
							value={value}
							error={invalid}
							helperText={invalid ? "Este modelo não aceita as ferramentas do Assistente." : FEATURES[key].hint}
							onChange={(event) => onFeatureModelChange(key, event.target.value === INHERIT ? undefined : event.target.value)}
							slotProps={{
								select: {
									MenuProps: selectMenuProps,
									renderValue: (selected) =>
										selected === INHERIT ? (
											<span className="text-slate-500 dark:text-slate-400">Padrão ({modelLabel(defaultModel)})</span>
										) : (
											modelLabel(String(selected))
										),
								},
							}}
						>
							<MenuItem value={INHERIT}>
								<ModelOption label={`Usar o padrão (${modelLabel(defaultModel)})`} />
							</MenuItem>
							{modelMenuItems({ forAssistant, current: value })}
						</TextField>
					);
				})}
			</div>

			{assistantBlocked && !featureModels.supervisor_chat && (
				<Alert severity="warning">
					O Assistente IA usaria o {modelLabel(assistantModel)}, que não aceita as ferramentas do Assistente. Escolha um
					modelo compatível para o Assistente IA.
				</Alert>
			)}
		</div>
	);
}
