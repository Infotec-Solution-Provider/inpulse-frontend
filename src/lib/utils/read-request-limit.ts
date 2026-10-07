import { isAxiosError } from "axios";

export function readRequestLimitMessage(error: unknown): string | null {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!isAxiosError(cause) || cause.response?.status !== 429 ||
      cause.response.data?.code !== "READ_REQUEST_LIMIT") return null;
  const seconds = Number(cause.response.headers?.["retry-after"] ?? cause.response.data?.retryAfterSeconds);
  const wait = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 2;
  return `Muitos carregamentos seguidos. Aguarde ${wait} segundos antes de tentar novamente.`;
}
