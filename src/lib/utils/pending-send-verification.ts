import type { WppMessage } from "@/lib/sdk-local";
import type { PendingChatSend } from "./pending-chat-sends";

export type PendingSendCheck = "automatic" | "checking" | "paused";
export type PendingSendChecks = Record<string, PendingSendCheck>;

const CHECK_DELAYS = [5_000, 10_000, 15_000, 20_000, 30_000, 30_000];
const VERIFICATION_WINDOW = 120_000;
const UNCONFIRMED_MESSAGE = "Ainda não foi possível confirmar o envio.";

function verificationProgress(attempt: PendingChatSend, now: number) {
  const timestamp = (value: number | undefined) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.min(value, now)
      : undefined;
  return {
    verificationStartedAt: timestamp(attempt.verificationStartedAt),
    verificationLastCheckedAt: timestamp(attempt.verificationLastCheckedAt),
    verificationChecks:
      typeof attempt.verificationChecks === "number" && Number.isFinite(attempt.verificationChecks)
        ? Math.max(0, Math.floor(attempt.verificationChecks))
        : 0,
  };
}

function canVerify(attempt: PendingChatSend): boolean {
  return (
    !!attempt.clientId &&
    (attempt.status === "unconfirmed" || (attempt.status === "sending" && !!attempt.messageId))
  );
}

function schedule(attempt: PendingChatSend, now: number): "waiting" | "due" | "paused" {
  const progress = verificationProgress(attempt, now);
  const checks = progress.verificationChecks;
  if (
    checks >= CHECK_DELAYS.length ||
    (progress.verificationStartedAt !== undefined &&
      now - progress.verificationStartedAt >= VERIFICATION_WINDOW)
  )
    return "paused";
  const lastCheck = progress.verificationLastCheckedAt ?? progress.verificationStartedAt;
  return lastCheck !== undefined && now - lastCheck >= CHECK_DELAYS[checks] ? "due" : "waiting";
}

interface VerificationOptions {
  getAttempts: () => PendingChatSend[];
  updateAttempt: (id: string, patch: Partial<PendingChatSend>) => void;
  lookup: (clientId: number, id: string) => Promise<WppMessage | null>;
  settle: (id: string, message: WppMessage) => void;
  onChange: (checks: PendingSendChecks) => void;
  now?: () => number;
}

/** Reconciles receipts only; it deliberately has no operation that can send a message. */
export class PendingSendVerifier {
  private active = true;
  private readonly checking = new Set<string>();
  private published = "";
  private readonly now: () => number;

  constructor(private readonly options: VerificationOptions) {
    this.now = options.now ?? Date.now;
  }

  stop(): void {
    this.active = false;
  }

  private getAttempt(id: string): PendingChatSend | undefined {
    return this.options.getAttempts().find((entry) => entry.id === id && canVerify(entry));
  }

  private publish(): void {
    if (!this.active) return;
    const checks: PendingSendChecks = {};
    for (const attempt of this.options.getAttempts()) {
      if (!canVerify(attempt)) continue;
      checks[attempt.id] = this.checking.has(attempt.id)
        ? "checking"
        : schedule(attempt, this.now()) === "paused"
          ? "paused"
          : "automatic";
    }
    const serialized = JSON.stringify(checks);
    if (serialized === this.published) return;
    this.published = serialized;
    this.options.onChange(checks);
  }

  private pauseIfExhausted(id: string): void {
    const attempt = this.getAttempt(id);
    if (attempt?.status === "sending" && schedule(attempt, this.now()) === "paused") {
      this.options.updateAttempt(id, { status: "unconfirmed", error: UNCONFIRMED_MESSAGE });
    }
  }

  tick(): void {
    if (!this.active) return;
    for (let attempt of this.options.getAttempts()) {
      if (!canVerify(attempt) || this.checking.has(attempt.id)) continue;
      const progress = verificationProgress(attempt, this.now());
      if (
        attempt.verificationStartedAt !== progress.verificationStartedAt ||
        attempt.verificationLastCheckedAt !== progress.verificationLastCheckedAt ||
        attempt.verificationChecks !== progress.verificationChecks
      ) {
        this.options.updateAttempt(attempt.id, progress);
        attempt = { ...attempt, ...progress };
      }
      if (attempt.verificationStartedAt === undefined) {
        this.options.updateAttempt(attempt.id, {
          verificationStartedAt: this.now(),
          verificationChecks: attempt.verificationChecks ?? 0,
        });
        continue;
      }
      if (schedule(attempt, this.now()) === "due") void this.check(attempt.id, true);
      else this.pauseIfExhausted(attempt.id);
    }
    this.publish();
  }

  async check(id: string, automatic = false): Promise<void> {
    const attempt = this.getAttempt(id);
    if (!this.active || !attempt || this.checking.has(id)) return;
    if (automatic && schedule(attempt, this.now()) !== "due") return;

    this.checking.add(id);
    const progress = verificationProgress(attempt, this.now());
    this.options.updateAttempt(id, {
      verificationStartedAt: progress.verificationStartedAt ?? this.now(),
      verificationChecks: progress.verificationChecks + 1,
      verificationLastCheckedAt: this.now(),
    });
    this.publish();
    try {
      const message = await this.options.lookup(attempt.clientId!, id);
      if (!this.active || !this.getAttempt(id)) return;
      if (message) this.options.settle(id, message);
      else this.options.updateAttempt(id, { error: UNCONFIRMED_MESSAGE });
    } catch {
      if (this.active && this.getAttempt(id)) {
        this.options.updateAttempt(id, {
          error: "Não foi possível verificar agora. Tente novamente em instantes.",
        });
      }
    } finally {
      this.checking.delete(id);
      if (this.active) {
        this.pauseIfExhausted(id);
        this.publish();
      }
    }
  }
}
