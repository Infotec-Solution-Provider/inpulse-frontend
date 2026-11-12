import type { MonitorOperational } from "./types";

export const DEFAULT_WAIT_THRESHOLDS = { warningMinutes: 30, criticalMinutes: 1440 };
export interface WaitThresholds { warningMinutes: number; criticalMinutes: number }
export type WaitSeverity = "normal" | "warning" | "critical";

/** Use the same positive whole-minute limits accepted by parameter settings. */
export function monitorWaitThresholds(parameters: Record<string, string | undefined>): WaitThresholds {
  const value = (key: string, fallback: number) => {
    const raw = parameters[key];
    if (raw === undefined || raw === null) return fallback;
    if (!/^\d+$/.test(raw.trim())) return null;
    const number = Number(raw);
    return Number.isSafeInteger(number) && number >= 1 && number <= 525600 ? number : null;
  };
  const warningMinutes = value("monitor:wait_warning_minutes", DEFAULT_WAIT_THRESHOLDS.warningMinutes);
  const criticalMinutes = value("monitor:wait_critical_minutes", DEFAULT_WAIT_THRESHOLDS.criticalMinutes);
  return warningMinutes !== null && criticalMinutes !== null && criticalMinutes > warningMinutes
    ? { warningMinutes, criticalMinutes }
    : { ...DEFAULT_WAIT_THRESHOLDS };
}

export function monitorWaitSeverity(
  operational: Pick<MonitorOperational, "status" | "waitingSince"> | undefined,
  thresholds: WaitThresholds,
  now: number,
): WaitSeverity | null {
  if (operational?.status !== "waiting_agent" || !operational.waitingSince) return null;
  const since = Date.parse(operational.waitingSince);
  if (!Number.isFinite(since) || !Number.isFinite(now)) return null;
  const elapsed = Math.max(0, now - since);
  if (elapsed >= thresholds.criticalMinutes * 60_000) return "critical";
  if (elapsed >= thresholds.warningMinutes * 60_000) return "warning";
  return "normal";
}
