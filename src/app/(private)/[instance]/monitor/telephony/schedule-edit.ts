import axios from "axios";
import type { TelephonyScheduleDetail, TelephonySchedulePatch } from "./types";

export function civilScheduleValue(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "00"] = match;
  const [year, month, day, hour, minute, second] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    return null;
  return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}`;
}

export function scheduleChanges(
  detail: TelephonyScheduleDetail,
  scheduledAt: string,
  operatorId: number | null,
): TelephonySchedulePatch["changes"] {
  const changes: TelephonySchedulePatch["changes"] = {};
  if (scheduledAt !== (detail.scheduledAt ?? "")) {
    const civil = civilScheduleValue(scheduledAt);
    if (!civil)
      throw new Error(
        "Informe uma data e hora válidas. A data do agendamento não pode ser removida.",
      );
    if (civil !== detail.scheduledAt) changes.scheduledAt = civil;
  }
  if (operatorId !== detail.operatorId) {
    if (operatorId === null || !Number.isSafeInteger(operatorId) || operatorId <= 0)
      throw new Error("Selecione um operador para o agendamento.");
    changes.operatorId = operatorId;
  }
  return changes;
}

export function scheduleFailureStatus(failure: unknown): number | undefined {
  if (axios.isAxiosError(failure)) return failure.response?.status;
  if (failure instanceof Error && failure.cause !== failure)
    return scheduleFailureStatus(failure.cause);
  return undefined;
}

function scheduleFailureCode(failure: unknown): string | undefined {
  if (axios.isAxiosError(failure)) {
    const code = failure.response?.data?.code;
    return typeof code === "string" ? code : undefined;
  }
  if (failure instanceof Error && failure.cause !== failure)
    return scheduleFailureCode(failure.cause);
  return undefined;
}

/** Only explicit non-commit responses permit another write after a server error. */
export function scheduleOutcomeUnknown(failure: unknown): boolean {
  const status = scheduleFailureStatus(failure);
  if (
    status === 503 &&
    ["SCHEDULE_EDIT_UNAVAILABLE", "SCHEDULE_EDIT_NOT_COMMITTED"].includes(
      scheduleFailureCode(failure) ?? "",
    )
  )
    return false;
  return status === undefined || status >= 500 || status === 408;
}
