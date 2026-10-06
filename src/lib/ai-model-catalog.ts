export type AiModelTier = "gpt56" | "flagship" | "mini" | "reasoning" | "legacy";

export type AiModelOption = {
	value: string;
	label: string;
	tier: AiModelTier;
};

/**
 * Sugestões das telas de IA. Ficam fora os modelos não testados com o in.pulse
 * (o3, o3-mini, o4-mini, o1-mini, GPT-4 Turbo e GPT-3.5 Turbo); o campo de modelo
 * do agente aceita digitação livre e o backend continua tratando essas famílias.
 */
export const AI_MODEL_CATALOG: AiModelOption[] = [
	{ value: "gpt-5.6-sol", label: "GPT-5.6 Sol", tier: "gpt56" },
	{ value: "gpt-5.6-terra", label: "GPT-5.6 Terra", tier: "gpt56" },
	{ value: "gpt-5.6-luna", label: "GPT-5.6 Luna", tier: "gpt56" },
	{ value: "gpt-5.5", label: "GPT-5.5", tier: "flagship" },
	{ value: "gpt-5.4", label: "GPT-5.4", tier: "flagship" },
	{ value: "gpt-5.4-mini", label: "GPT-5.4 Mini", tier: "mini" },
	{ value: "gpt-5.4-nano", label: "GPT-5.4 Nano", tier: "mini" },
	{ value: "gpt-4o", label: "GPT-4o", tier: "legacy" },
	{ value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "legacy" },
];

/**
 * Se o agente envia temperatura para o modelo. Espelha a tabela de capacidades do
 * ai-service: a série o (o1, o3, o4-mini…), o gpt-5 base (gpt-5, gpt-5-mini…, exceto
 * gpt-5-chat) e a família gpt-5.6 (sem reasoning_effort "none") ignoram a temperatura.
 */
export function modelSupportsTemperature(model: string): boolean {
	const normalized = model.trim().toLowerCase();

	if (/^o\d/.test(normalized)) return false;
	if (normalized === "gpt-5") return false;
	if (normalized.startsWith("gpt-5-") && !normalized.startsWith("gpt-5-chat")) return false;
	if (/^gpt-5\.6(?![\d])/.test(normalized)) return false;

	return true;
}
