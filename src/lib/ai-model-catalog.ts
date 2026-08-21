export type AiModelTier = "gpt56" | "flagship" | "mini" | "reasoning" | "legacy";

export type AiModelOption = {
	value: string;
	label: string;
	tier: AiModelTier;
};

export const AI_MODEL_CATALOG: AiModelOption[] = [
	{ value: "gpt-5.6-sol", label: "GPT-5.6 Sol", tier: "gpt56" },
	{ value: "gpt-5.6-terra", label: "GPT-5.6 Terra", tier: "gpt56" },
	{ value: "gpt-5.6-luna", label: "GPT-5.6 Luna", tier: "gpt56" },
	{ value: "gpt-5.5", label: "GPT-5.5", tier: "flagship" },
	{ value: "gpt-5.4", label: "GPT-5.4", tier: "flagship" },
	{ value: "gpt-5.4-mini", label: "GPT-5.4 Mini", tier: "mini" },
	{ value: "gpt-5.4-nano", label: "GPT-5.4 Nano", tier: "mini" },
	{ value: "o4-mini", label: "o4 Mini", tier: "reasoning" },
	{ value: "o3-mini", label: "o3 Mini", tier: "reasoning" },
	{ value: "o3", label: "o3", tier: "reasoning" },
	{ value: "gpt-4o", label: "GPT-4o", tier: "legacy" },
	{ value: "gpt-4o-mini", label: "GPT-4o Mini", tier: "legacy" },
	{ value: "gpt-4-turbo", label: "GPT-4 Turbo", tier: "legacy" },
	{ value: "o1-mini", label: "o1 Mini", tier: "legacy" },
	{ value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", tier: "legacy" },
];
