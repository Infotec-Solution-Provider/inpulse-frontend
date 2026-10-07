import { ASSISTANT_MODEL_CATALOG, isWholeCatalogSelected } from "@/lib/ai-model-catalog";
import type { AiFeatureModels, AiTenantConfig } from "@/lib/types/sdk-local.types";

/** Estado editável da tela de configurações de IA (valores numéricos como texto, como nos campos). */
export type AiSettingsForm = {
	defaultModel: string;
	budget: string;
	selectedModels: string[];
	featureModels: AiFeatureModels;
	/** operatorId → limite mensal em US$. */
	operatorBudgets: Record<string, string>;
};

export type AiSettingsPayload = {
	model: string;
	monthlyBudgetUsd: number | null;
	availableModels: string[] | null;
	featureModels: AiFeatureModels | null;
	operatorBudgets: Record<string, number> | null;
};

export type AiSettingsValidation =
	| { ok: true; payload: AiSettingsPayload }
	| { ok: false; error: string; field: "budget" | `operator:${string}` };

export const FEATURE_KEYS: Array<keyof AiFeatureModels> = [
	"suggest_response",
	"summarize_chat",
	"analyze_customer",
	"supervisor_chat",
];

export function formFromConfig(config: AiTenantConfig): AiSettingsForm {
	const operatorBudgets: Record<string, string> = {};
	for (const [id, value] of Object.entries(config.operatorBudgets ?? {})) {
		if (typeof value === "number" && Number.isFinite(value)) operatorBudgets[id] = String(value);
	}

	return {
		defaultModel: config.model,
		budget: config.monthlyBudgetUsd != null ? String(config.monthlyBudgetUsd) : "",
		selectedModels: config.availableModels ?? ASSISTANT_MODEL_CATALOG.map((model) => model.value),
		featureModels: cleanFeatureModels(config.featureModels ?? {}),
		operatorBudgets,
	};
}

function cleanFeatureModels(featureModels: AiFeatureModels): AiFeatureModels {
	const result: AiFeatureModels = {};
	for (const key of FEATURE_KEYS) {
		const value = featureModels[key]?.trim();
		if (value) result[key] = value;
	}
	return result;
}

/** Chave comparável do formulário: a ordem de marcação dos modelos e dos operadores não conta. */
export function formKey(form: AiSettingsForm): string {
	return JSON.stringify({
		defaultModel: form.defaultModel,
		budget: form.budget.trim(),
		selectedModels: [...form.selectedModels].sort(),
		featureModels: cleanFeatureModels(form.featureModels),
		operatorBudgets: Object.entries(form.operatorBudgets)
			.map(([id, value]) => [id, value.trim()])
			.sort(([left], [right]) => left.localeCompare(right)),
	});
}

/** Valor positivo digitado (vírgula ou ponto) ou null quando inválido. */
export function parsePositiveUsd(raw: string): number | null {
	const value = Number(raw.trim().replace(",", "."));
	return raw.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

export function validateForm(form: AiSettingsForm): AiSettingsValidation {
	let monthlyBudgetUsd: number | null = null;
	if (form.budget.trim() !== "") {
		monthlyBudgetUsd = parsePositiveUsd(form.budget);
		if (monthlyBudgetUsd === null) {
			return {
				ok: false,
				field: "budget",
				error: "Limite mensal inválido. Informe um valor positivo ou deixe em branco para não limitar.",
			};
		}
	}

	const operatorBudgets: Record<string, number> = {};
	for (const [id, raw] of Object.entries(form.operatorBudgets)) {
		const value = parsePositiveUsd(raw);
		if (value === null) {
			return { ok: false, field: `operator:${id}`, error: "Informe um limite positivo para cada operador ou remova a linha." };
		}
		operatorBudgets[id] = value;
	}

	const featureModels = cleanFeatureModels(form.featureModels);
	// Nenhum marcado também grava null: o ai-service trata a lista vazia como "sem restrição".
	const unrestricted =
		form.selectedModels.length === 0 || isWholeCatalogSelected(form.selectedModels, ASSISTANT_MODEL_CATALOG);

	return {
		ok: true,
		payload: {
			model: form.defaultModel,
			monthlyBudgetUsd,
			availableModels: unrestricted ? null : form.selectedModels,
			featureModels: Object.keys(featureModels).length === 0 ? null : featureModels,
			operatorBudgets: Object.keys(operatorBudgets).length === 0 ? null : operatorBudgets,
		},
	};
}
