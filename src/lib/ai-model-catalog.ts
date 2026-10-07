export type AiModelTier = "gpt6" | "gpt56" | "gpt5" | "legacy";

export type AiModelOption = {
	value: string;
	label: string;
	tier: AiModelTier;
	/** Para que o modelo serve, em uma frase curta. */
	description: string;
	/** US$ por 1 milhão de tokens: os mesmos valores do MODEL_PRICING do ai-service. */
	pricing: { input: number; output: number };
	/**
	 * Aceita as ferramentas do Assistente IA. GPT-6 Astra e GPT-6.1 Sol só aceitam
	 * function calling na Responses API, e o ai-service usa o Chat Completions.
	 */
	assistant: boolean;
	isNew?: boolean;
	/** Modelo descontinuado pela OpenAI: sai da API na data indicada. */
	deprecation?: { shutdownAt: string; replacement: string };
};

export const AI_MODEL_TIERS: Array<{ value: AiModelTier; label: string; description: string }> = [
	{ value: "gpt6", label: "GPT-6", description: "Geração atual, lançada em setembro e outubro de 2026." },
	{ value: "gpt56", label: "GPT-5.6", description: "Geração anterior em três faixas de custo." },
	{ value: "gpt5", label: "GPT-5.5 e GPT-5.4", description: "Modelos estáveis já usados no in.pulse." },
	{ value: "legacy", label: "GPT-4o", description: "Geração antiga, mantida para compatibilidade." },
];

/**
 * Sugestões das telas de IA. Ficam fora os modelos não testados com o in.pulse
 * (o3, o3-mini, o4-mini, o1-mini, GPT-4 Turbo e GPT-3.5 Turbo); o campo de modelo
 * do agente aceita digitação livre e o backend continua tratando essas famílias.
 * Preços e descontinuações conferidos em developers.openai.com em 07/10/2026.
 */
export const AI_MODEL_CATALOG: AiModelOption[] = [
	{
		value: "gpt-6-astra",
		label: "GPT-6 Astra",
		tier: "gpt6",
		description: "O mais capaz, para análises longas e complexas.",
		pricing: { input: 10, output: 50 },
		assistant: false,
		isNew: true,
	},
	{
		value: "gpt-6.1-sol",
		label: "GPT-6.1 Sol",
		tier: "gpt6",
		description: "Quase o nível do Astra, por um quinto do preço.",
		pricing: { input: 2, output: 10 },
		assistant: false,
		isNew: true,
	},
	{
		value: "gpt-6-sol",
		label: "GPT-6 Sol",
		tier: "gpt6",
		description: "Equilíbrio entre qualidade e custo para o dia a dia.",
		pricing: { input: 2, output: 10 },
		assistant: true,
		isNew: true,
	},
	{
		value: "gpt-6-luna",
		label: "GPT-6 Luna",
		tier: "gpt6",
		description: "O mais econômico, para resumos e alto volume.",
		pricing: { input: 0.1, output: 0.5 },
		assistant: true,
		isNew: true,
	},
	{
		value: "gpt-5.6-sol",
		label: "GPT-5.6 Sol",
		tier: "gpt56",
		description: "Raciocínio profundo da geração 5.6.",
		pricing: { input: 4, output: 20 },
		assistant: true,
	},
	{
		value: "gpt-5.6-terra",
		label: "GPT-5.6 Terra",
		tier: "gpt56",
		description: "Trabalho diário de alto volume.",
		pricing: { input: 2, output: 12 },
		assistant: true,
	},
	{
		value: "gpt-5.6-luna",
		label: "GPT-5.6 Luna",
		tier: "gpt56",
		description: "Resumos, rascunhos e classificação.",
		pricing: { input: 0.2, output: 1.2 },
		assistant: true,
	},
	{
		value: "gpt-5.5",
		label: "GPT-5.5",
		tier: "gpt5",
		description: "Modelo de ponta da geração 5.",
		pricing: { input: 5, output: 30 },
		assistant: true,
	},
	{
		value: "gpt-5.4",
		label: "GPT-5.4",
		tier: "gpt5",
		description: "Equilibrado; é o padrão de fábrica do in.pulse.",
		pricing: { input: 2.5, output: 15 },
		assistant: true,
	},
	{
		value: "gpt-5.4-mini",
		label: "GPT-5.4 Mini",
		tier: "gpt5",
		description: "Versão rápida e barata do GPT-5.4.",
		pricing: { input: 0.75, output: 4.5 },
		assistant: true,
	},
	{
		value: "gpt-5.4-nano",
		label: "GPT-5.4 Nano",
		tier: "gpt5",
		description: "O menor da geração 5.4.",
		pricing: { input: 0.2, output: 1.25 },
		assistant: true,
		deprecation: { shutdownAt: "2027-04-01", replacement: "gpt-6-luna" },
	},
	{
		value: "gpt-4o",
		label: "GPT-4o",
		tier: "legacy",
		description: "Geração anterior, sem raciocínio.",
		pricing: { input: 2.5, output: 10 },
		assistant: true,
	},
	{
		value: "gpt-4o-mini",
		label: "GPT-4o Mini",
		tier: "legacy",
		description: "Versão econômica do GPT-4o.",
		pricing: { input: 0.15, output: 0.6 },
		assistant: true,
	},
];

/**
 * Modelos que o operador pode escolher no Assistente IA. A lista de modelos liberados da
 * empresa (`availableModels`) só restringe essa escolha, então é comparada com este recorte.
 */
export const ASSISTANT_MODEL_CATALOG: AiModelOption[] = AI_MODEL_CATALOG.filter((model) => model.assistant);

export function findCatalogModel(value: string | null | undefined): AiModelOption | undefined {
	if (!value) return undefined;
	return AI_MODEL_CATALOG.find((model) => model.value === value);
}

/** Nome amigável do modelo; o valor bruto quando ele está fora do catálogo. */
export function modelLabel(value: string): string {
	return findCatalogModel(value)?.label ?? value;
}

/** Se o modelo atende o Assistente IA. Modelos fora do catálogo ficam a critério do ai-service. */
export function modelSupportsAssistant(value: string): boolean {
	return findCatalogModel(value)?.assistant ?? true;
}

/**
 * Se a seleção de modelos liberados é exatamente o catálogo: todos os itens marcados e nenhum
 * valor fora dele. Só nesse caso a tela grava `availableModels: null` (sem restrição); comparar
 * só a quantidade trocaria uma lista restrita gravada antes do corte do catálogo por `null`.
 */
export function isWholeCatalogSelected(
	selected: readonly string[],
	catalog: readonly AiModelOption[] = AI_MODEL_CATALOG,
): boolean {
	const catalogValues = new Set(catalog.map((model) => model.value));

	return (
		catalog.every((model) => selected.includes(model.value)) &&
		selected.every((value) => catalogValues.has(value))
	);
}

/**
 * Modelos que não estão no catálogo (por exemplo, o3 liberado antes do corte), sem repetição e
 * na ordem recebida, para a tela mostrá-los e permitir desmarcá-los.
 */
export function getOffCatalogModels(
	values: readonly string[],
	catalog: readonly AiModelOption[] = AI_MODEL_CATALOG,
): string[] {
	const catalogValues = new Set(catalog.map((model) => model.value));
	const result: string[] = [];

	for (const value of values) {
		if (!catalogValues.has(value) && !result.includes(value)) {
			result.push(value);
		}
	}

	return result;
}

/**
 * Se o agente envia temperatura para o modelo. Espelha a tabela de capacidades do
 * ai-service: a série o (o1, o3, o4-mini…), o gpt-5 base (gpt-5, gpt-5-mini…, exceto
 * gpt-5-chat) e as famílias gpt-5.6 e gpt-6 (sem reasoning_effort "none") ignoram a temperatura.
 */
export function modelSupportsTemperature(model: string): boolean {
	const normalized = model.trim().toLowerCase();

	if (/^o\d/.test(normalized)) return false;
	if (normalized === "gpt-5") return false;
	if (normalized.startsWith("gpt-5-") && !normalized.startsWith("gpt-5-chat")) return false;
	if (/^gpt-5\.6(?![\d])/.test(normalized)) return false;
	if (/^gpt-6(?:$|[.-])/.test(normalized)) return false;

	return true;
}
