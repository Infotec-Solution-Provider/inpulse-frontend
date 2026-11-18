"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import { crmMutationConfig } from "@/lib/sdk-local/crm-request-context";
import type { CustomerCallHistoryDetail } from "./(chats-menu)/(start-chat-modal)/customer-crm-detail-modal.types";

export interface AttendanceCall {
  id: number;
  time: number;
  end: number | null;
  title: string;
  result: string | null;
}

export interface AttendanceHistory {
  calls: AttendanceCall[];
  status: "loading" | "ready" | "error" | "unlinked";
}

const NO_CALLS: AttendanceCall[] = [];

export function mapAttendanceCalls(records: CustomerCallHistoryDetail[]): AttendanceCall[] {
  return records.flatMap((record) => {
    if (record.CANAL_ATENDIMENTO === "WhatsApp" || record.WHATSAPP_CHAT_ID != null) return [];
    const time = Date.parse(record.LIGACAO_RECEBIDA);
    if (!Number.isFinite(time)) return [];
    const end = Date.parse(record.LIGACAO_FINALIZADA);
    const title =
      record.TIPO_ACAO === "RECEP"
        ? "Ligação recebida"
        : record.TIPO_ACAO === "ATIVO"
          ? "Ligação realizada"
          : "Ligação registrada";
    return [
      {
        id: record.CODIGO,
        time,
        end: end >= time ? end : null,
        title,
        result: record.RESULTADO_NOME || null,
      },
    ];
  });
}

export function useIntegratedCallHistory(
  enabled: boolean,
  customerId: number | null,
  version: string,
) {
  const { instance, token, user } = useAuthContext();
  const scope = enabled && token && customerId ? `${instance}:${user?.CODIGO}:${customerId}` : null;
  const [result, setResult] = useState<{ scope: string; history: AttendanceHistory } | null>(null);

  useEffect(() => {
    if (!scope || !token || !customerId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await customersService.ax.get<{
          data: { callHistory: CustomerCallHistoryDetail[] };
        }>(`/api/customers/${customerId}/full`, {
          ...crmMutationConfig({ instance, token }),
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResult({
            scope,
            history: { status: "ready", calls: mapAttendanceCalls(response.data.data.callHistory) },
          });
        }
      } catch {
        if (!controller.signal.aborted)
          setResult({ scope, history: { status: "error", calls: NO_CALLS } });
      }
    })();
    return () => controller.abort();
  }, [scope, token, instance, customerId, version]);

  if (!enabled) return undefined;
  if (!scope) return { status: "unlinked", calls: NO_CALLS } as const;
  return result?.scope === scope
    ? result.history
    : ({ status: "loading", calls: NO_CALLS } as const);
}
