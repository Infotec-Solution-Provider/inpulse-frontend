/** ApiClient retains the Axios response in Error.cause. Do not infer domain errors from text. */
export function getCustomerSegmentsError(error: unknown): { status?: number; code?: string } {
  const visited = new Set<object>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const value = current as {
      response?: { status?: number; data?: { code?: string } };
      status?: number;
      code?: string;
      cause?: unknown;
    };
    const status = value.response?.status ?? value.status;
    const code = value.response?.data?.code ?? value.code;
    if (typeof status === "number")
      return { status, ...(typeof code === "string" ? { code } : {}) };
    current = value.cause;
  }
  return {};
}
