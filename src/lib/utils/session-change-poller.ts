export interface ChangePage<T> {
  resetRequired: boolean;
  changes: T | null;
  nextCursor: string | null;
  hasMore: boolean;
}

interface PollOptions<S, T> {
  snapshot: (signal: AbortSignal) => Promise<S & { syncCursor: string }>;
  changes: (cursor: string, signal: AbortSignal) => Promise<ChangePage<T>>;
  applySnapshot: (snapshot: S) => void;
  applyChanges: (changes: T) => void;
  canRun: () => boolean;
  generation: () => number;
  onError: (error: unknown) => void;
  onRunning?: (running: boolean) => void;
  random?: () => number;
}

interface SyncErrorResponse {
  status?: number;
  headers?: Record<string, unknown>;
  data?: { code?: string; retryAfterSeconds?: number };
}

/** The SDK preserves Axios failures as Error.cause. */
export function syncErrorResponse(error: unknown): SyncErrorResponse | undefined {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const failure = current as { response?: SyncErrorResponse; cause?: unknown };
    if (failure.response) return failure.response;
    current = failure.cause;
  }
}

/** One timer, one request at a time. Socket deliveries never advance this cursor. */
export class SessionChangePoller<S, T> {
  private cursor: string | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | null = null;
  private stopped = false;
  private running = false;
  private wakeAgain = false;
  private resetRequested = false;
  private errors = 0;
  private nextAllowedAt = 0;

  constructor(private readonly options: PollOptions<S, T>) {}

  public wake(reset = false): void {
    if (this.stopped) return;
    if (reset) this.resetRequested = true;
    if (this.running) { this.wakeAgain = true; return; }
    this.schedule(0);
  }

  public stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.controller?.abort();
  }

  private schedule(delay: number) {
    clearTimeout(this.timer);
    if (!this.stopped) this.timer = setTimeout(() => { void this.run(); },
      Math.max(delay, this.nextAllowedAt - Date.now()));
  }

  private async run() {
    if (this.stopped || this.running) return;
    if (!this.options.canRun()) return; // visibility/online events wake it again.
    this.running = true;
    this.options.onRunning?.(true);
    this.wakeAgain = false;
    this.controller = new AbortController();
    const signal = this.controller.signal;
    const timeout = setTimeout(() => this.controller?.abort(), 20000);
    let delay = 120000;
    try {
      if (this.resetRequested) { this.cursor = null; this.resetRequested = false; }
      const generation = this.options.generation();
      if (this.cursor === null) {
        const snapshot = await this.options.snapshot(signal);
        if (this.stopped || signal.aborted) return;
        if (generation !== this.options.generation() || this.resetRequested) { delay = 1000; return; }
        if (!snapshot.syncCursor) throw new Error("Snapshot did not include a synchronization cursor");
        this.options.applySnapshot(snapshot);
        this.cursor = snapshot.syncCursor;
        delay = 0; // Replay commits made while the snapshot was loading.
      } else {
        const page = await this.options.changes(this.cursor, signal);
        if (this.stopped || signal.aborted) return;
        if (generation !== this.options.generation() || this.resetRequested) { delay = 1000; return; }
        if (page.resetRequired) { this.cursor = null; delay = 0; return; }
        if (!page.nextCursor || page.changes === null) throw new Error("Invalid synchronization page");
        // Apply first. A failed reducer leaves the old cursor eligible for retry.
        this.options.applyChanges(page.changes);
        this.cursor = page.nextCursor;
        // Leave capacity for interactive reads in the shared 30 requests / 10s quota.
        if (page.hasMore) delay = 1000;
      }
      this.errors = 0;
    } catch (error) {
      if (!this.stopped) {
        this.errors++;
        delay = Math.min(120000, 15000 * 2 ** Math.min(this.errors, 3));
        const response = syncErrorResponse(error);
        const header = response?.headers?.["retry-after"];
        const seconds = Number(header ?? response?.data?.retryAfterSeconds);
        const retryAfterMs = Number.isFinite(seconds) ? seconds * 1000 :
          typeof header === "string" ? Date.parse(header) - Date.now() : 0;
        if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) delay = Math.max(delay, retryAfterMs);
        this.options.onError(error);
      }
    } finally {
      clearTimeout(timeout);
      this.controller = null;
      this.running = false;
      this.options.onRunning?.(false);
      // Focus, reconnect and manual refresh cannot bypass cooldown or flood reads.
      this.nextAllowedAt = Date.now() + (this.errors > 0 ? delay : 1000);
      this.schedule(this.wakeAgain && this.errors === 0 ? 0 : delay);
    }
  }
}
