import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { UnifiedSchedulesResponse, WhatsappClient } from "@/lib/sdk-local";
import { serializeScheduleQuery, type ScheduleQuery } from "./schedule-query";

export function useSchedulesQuery({
  client,
  token,
  scope,
  query,
}: {
  client: RefObject<WhatsappClient>;
  token: string | null;
  scope: string;
  query: ScheduleQuery;
}) {
  const filters = useMemo(() => serializeScheduleQuery(query), [query]);
  const key = JSON.stringify([scope, filters]);
  const generation = useRef(0);
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data?: UnifiedSchedulesResponse;
    error?: string;
    loading: boolean;
  }>({ key: "", loading: true });
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    const valid = () => generation.current === current && !controller.signal.aborted;
    if (!token || !client.current) {
      setState({
        key,
        error: "A sessão está indisponível. Entre novamente para consultar sua agenda.",
        loading: false,
      });
      return () => controller.abort();
    }
    setState((previous) => ({
      key,
      data: previous.key === key ? previous.data : undefined,
      loading: true,
    }));
    client.current.setAuth(token);
    client.current
      .getMySchedules(filters, controller.signal)
      .then((data) => {
        if (valid()) setState({ key, data, loading: false });
      })
      .catch((failure: unknown) => {
        if (!valid()) return;
        setState((previous) => ({
          key,
          data: previous.key === key ? previous.data : undefined,
          error:
            failure instanceof Error
              ? failure.message
              : "Não foi possível carregar os agendamentos.",
          loading: false,
        }));
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [key, token, client, refresh]);
  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: !current || state.loading,
    refetch: () => setRefresh((value) => value + 1),
  };
}
