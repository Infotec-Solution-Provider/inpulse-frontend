export class TelephonyFilterValidationError extends Error {}

export function validTelephonyMonth(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    Number(value.slice(0, 4)) >= 1970 &&
    Number(value.slice(0, 4)) <= 2200
  );
}

/** Reject civil dates that Date would otherwise roll into a different month. */
export function telephonyDateBound(value: string | null, end: boolean): string | null {
  if (!value) return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(
      value,
    );
  if (!match) throw new TelephonyFilterValidationError("Informe um período válido.");
  const [year, month, day] = match.slice(1, 4).map(Number);
  const civil = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1970 ||
    year > 2200 ||
    civil.getUTCFullYear() !== year ||
    civil.getUTCMonth() !== month - 1 ||
    civil.getUTCDate() !== day ||
    Number(match[4] ?? 0) > 23 ||
    Number(match[5] ?? 0) > 59 ||
    Number(match[6] ?? 0) > 59
  )
    throw new TelephonyFilterValidationError("Informe um período válido.");
  const date =
    value.length === 10
      ? new Date(year, month - 1, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0)
      : new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new TelephonyFilterValidationError("Informe um período válido.");
  return date.toISOString();
}
