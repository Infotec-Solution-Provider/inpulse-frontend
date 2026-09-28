import { TELEPHONY_DATE_FIELDS } from "./filter-state";
import type { TelephonyMonitorFilters } from "./types";
import {
  TelephonyFilterValidationError,
  telephonyDateBound,
  validTelephonyMonth,
} from "./date-values";

export function telephonyApiFilters(filters: TelephonyMonitorFilters) {
  if (!validTelephonyMonth(filters.referenceMonth))
    throw new TelephonyFilterValidationError(
      "Informe um mês de referência entre janeiro de 1970 e dezembro de 2200.",
    );
  for (const key of [
    "campaignIds",
    "groupIds",
    "segmentIds",
    "originIds",
    "productIds",
    "states",
    "cities",
    "neighborhoods",
  ] as const) {
    if (filters[key].length > 100)
      throw new TelephonyFilterValidationError("Selecione no máximo 100 opções por filtro.");
  }
  const [year, month] = filters.referenceMonth.split("-").map(Number);
  const ranges = Object.fromEntries(
    TELEPHONY_DATE_FIELDS.map((key) => {
      const from = telephonyDateBound(filters[key].from, false);
      const to = telephonyDateBound(filters[key].to, true);
      if (from && to && from > to)
        throw new TelephonyFilterValidationError("O início do período deve ser anterior ao fim.");
      return [key, { from, to }];
    }),
  );
  return {
    ...filters,
    ...ranges,
    referencePeriod: {
      from: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
      to: new Date(year, month, 0, 23, 59, 59, 999).toISOString(),
    },
  };
}
