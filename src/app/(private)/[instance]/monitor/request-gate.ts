import { isAxiosError } from "axios";

export interface MonitorRequestTicket {
  generation: number;
  controller: AbortController;
}

/** One current request batch; a canceled transport may finish, but cannot commit. */
export class MonitorRequestGate {
  private generation = 0;
  private current: MonitorRequestTicket | null = null;
  public retryAfterUntil = 0;

  public get busy(): boolean {
    return this.current !== null;
  }

  public begin(now = Date.now()): MonitorRequestTicket | null {
    if (this.busy || now < this.retryAfterUntil) return null;
    const ticket = { generation: ++this.generation, controller: new AbortController() };
    this.current = ticket;
    return ticket;
  }

  public isCurrent(ticket: MonitorRequestTicket): boolean {
    return (
      this.current === ticket &&
      ticket.generation === this.generation &&
      !ticket.controller.signal.aborted
    );
  }

  public complete(ticket: MonitorRequestTicket): void {
    if (this.isCurrent(ticket)) this.current = null;
  }

  public invalidate(): void {
    this.current?.controller.abort();
    this.current = null;
    this.generation++;
  }

  public recordFailure(error: unknown, now = Date.now()): number {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (!isAxiosError(cause) || cause.response?.status !== 429) return this.retryAfterUntil;
    const header = cause.response.headers?.["retry-after"];
    const seconds = Number(header ?? cause.response.data?.retryAfterSeconds);
    const until =
      Number.isFinite(seconds) && seconds > 0
        ? now + Math.ceil(seconds * 1000)
        : typeof header === "string" && Number.isFinite(Date.parse(header))
          ? Date.parse(header)
          : now + 2_000;
    this.retryAfterUntil = Math.max(this.retryAfterUntil, now + 2_000, until);
    return this.retryAfterUntil;
  }
}
