import { MonitorRequestGate, type MonitorRequestTicket } from "../request-gate";

export type TelephonyRefreshKind = "query" | "manual" | "auto";

/** Coalesces refresh intent without losing an explicit action behind an automatic request. */
export class TelephonyRefreshController {
  public readonly gate = new MonitorRequestGate();
  private pending: TelephonyRefreshKind | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeKind: TelephonyRefreshKind | null = null;
  private lastStarted = -Infinity;
  private disposed = false;

  public constructor(
    private readonly canRun: (kind: TelephonyRefreshKind) => boolean,
    private readonly execute: (
      kind: TelephonyRefreshKind,
      ticket: MonitorRequestTicket,
    ) => Promise<void>,
  ) {}

  public request(kind: TelephonyRefreshKind): void {
    if (this.disposed) return;
    if (kind === "auto" && !this.canRun(kind)) return;
    if (kind !== "auto" || this.pending === null) this.pending = kind;
    if (this.timer && kind !== "auto") this.clearTimer();
    if (this.timer || this.gate.busy || !this.canRun(this.pending)) return;
    const delay = Math.max(
      0,
      this.gate.retryAfterUntil - Date.now(),
      this.pending === "auto" ? this.lastStarted + 5_000 - Date.now() : 0,
    );
    this.timer = setTimeout(() => {
      this.timer = null;
      const next = this.pending;
      if (!next || !this.canRun(next)) return;
      this.pending = null;
      const ticket = this.gate.begin();
      if (!ticket) {
        this.request(next);
        return;
      }
      this.activeKind = next;
      this.lastStarted = Date.now();
      void this.execute(next, ticket)
        .catch(() => undefined)
        .finally(() => {
          if (!this.gate.isCurrent(ticket)) return;
          this.gate.complete(ticket);
          this.activeKind = null;
          if (this.pending) this.request(this.pending);
        });
    }, delay);
  }

  public get busy(): boolean {
    return this.gate.busy;
  }

  public suspend(): void {
    this.clearTimer();
    if (this.activeKind && this.pending !== "manual" && this.pending !== "query")
      this.pending = this.activeKind;
    this.gate.invalidate();
    this.activeKind = null;
  }

  public resume(fallback: TelephonyRefreshKind): void {
    this.request(this.pending ?? fallback);
  }

  public pauseAutomatic(): void {
    if (this.pending === "auto") {
      this.pending = null;
      this.clearTimer();
    }
    if (this.activeKind === "auto") {
      this.gate.invalidate();
      this.activeKind = null;
    }
    if (this.pending) this.request(this.pending);
  }

  public reset(): void {
    this.gate.invalidate();
    this.clearTimer();
    this.pending = null;
    this.activeKind = null;
    this.disposed = false;
  }

  public dispose(): void {
    this.reset();
    this.disposed = true;
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
