import { syncErrorResponse } from "./session-change-poller";

/** Bounded recovery for an explicitly selected read; never retries writes or other errors. */
export async function retryLimitedRead<T>(read: () => Promise<T>, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    try { return await read(); }
    catch (error) {
      const response = syncErrorResponse(error);
      if (signal.aborted || response?.status !== 429 ||
        response.data?.code !== "READ_REQUEST_LIMIT" || attempt >= 3) throw error;
      const header = response.headers?.["retry-after"];
      const seconds = Number(header ?? response.data.retryAfterSeconds);
      const serverDelay = Number.isFinite(seconds) ? seconds * 1000 :
        typeof header === "string" ? Date.parse(header) - Date.now() : 0;
      const delay = Math.max(2000 * 2 ** attempt, Number.isFinite(serverDelay) ? serverDelay : 0);
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delay);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) { signal.removeEventListener("abort", abort); abort(); }
      });
    }
  }
}
