/** Limite da pergunta, igual ao do ai-service (SendSupervisorChatMessageSchema). */
export const SUPERVISOR_MESSAGE_MAX_LENGTH = 4000;

/** Contador discreto do campo de pergunta: só aparece depois de 80% do limite. */
export function messageLengthHint(
	length: number,
	max: number = SUPERVISOR_MESSAGE_MAX_LENGTH,
): { label: string; atLimit: boolean } | null {
	if (!Number.isFinite(length) || length <= max * 0.8) return null;
	const format = (value: number) => value.toLocaleString("pt-BR");
	return { label: `${format(Math.min(length, max))} / ${format(max)}`, atLimit: length >= max };
}
