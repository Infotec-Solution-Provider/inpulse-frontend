import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../../socket-context";
import { SocketEventType } from "@/lib/sdk-local/types/socket-events.types";
import { readRequestLimitMessage } from "@/lib/utils/read-request-limit";
import telephonyMonitorService from "@/lib/services/telephony-monitor.service";
import { TelephonyRefreshController, type TelephonyRefreshKind } from "./refresh-controller";
import type { MonitorRequestTicket } from "../request-gate";
import type { TelephonyMonitorFilters, TelephonyMonitorResult } from "./types";
import { TelephonyFilterValidationError } from "./date-values";

interface Options {
  scopeKey: string;
  identityKey: string;
  token: string | null;
  filters: TelephonyMonitorFilters;
  page: number;
  pageSize: number;
  enabled: boolean;
  autoRefresh: boolean;
  modalOpen: boolean;
  onPageOverflow: (page: number) => void;
}
const EVENTS = [
  SocketEventType.TelephonyCallReceived,
  SocketEventType.WppChatStarted,
  SocketEventType.WppChatFinished,
  SocketEventType.WppMessage,
];
const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

export function useTelephonyMonitorData(options: Options) {
  const { socket } = useContext(SocketContext);
  const [result, setResult] = useState<{
    data: TelephonyMonitorResult;
    dataKey: string;
    at: number;
  } | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryAfterUntil, setRetryAfterUntil] = useState<number | null>(null);
  const dataKey = JSON.stringify([
    options.scopeKey,
    options.page,
    options.pageSize,
    options.filters,
  ]);
  const queryKey = JSON.stringify([dataKey, options.token, options.enabled]);
  const latest = useRef({ ...options, dataKey, queryKey });
  latest.current = { ...options, dataKey, queryKey };
  const mounted = useRef(false);
  const lastIdentity = useRef(options.identityKey);
  const execute = useRef<
    (kind: TelephonyRefreshKind, ticket: MonitorRequestTicket) => Promise<void>
  >(async () => undefined);
  const controller = useRef<TelephonyRefreshController | null>(null);
  const hasResult = result?.dataKey === dataKey;
  const canRun = (kind: TelephonyRefreshKind) =>
    Boolean(
      latest.current.enabled &&
        latest.current.token &&
        visible() &&
        (kind !== "auto" || (latest.current.autoRefresh && !latest.current.modalOpen)),
    );
  if (!controller.current)
    controller.current = new TelephonyRefreshController(canRun, (kind, ticket) =>
      execute.current(kind, ticket),
    );

  execute.current = async (kind, ticket) => {
    const currentController = controller.current!;
    const request = latest.current;
    const isCurrent = () =>
      mounted.current &&
      currentController.gate.isCurrent(ticket) &&
      latest.current.queryKey === request.queryKey &&
      canRun(kind);
    setBusy(true);
    setRetryAfterUntil(null);
    try {
      const data = await telephonyMonitorService.search(
        { page: request.page, pageSize: request.pageSize, filters: request.filters },
        ticket.controller.signal,
      );
      if (!isCurrent()) return;
      const lastPage = Math.max(1, Math.ceil(data.totalCount / request.pageSize));
      if (request.page > lastPage) {
        request.onPageOverflow(lastPage);
        return;
      }
      setResult({ data, dataKey: request.dataKey, at: Date.now() });
      setErrorState(null);
    } catch (failure) {
      if (!isCurrent()) return;
      const until = currentController.gate.recordFailure(failure);
      if (until > Date.now()) setRetryAfterUntil(until);
      setErrorState({
        key: request.dataKey,
        message:
          failure instanceof TelephonyFilterValidationError
            ? failure.message
            : readRequestLimitMessage(failure) ||
              (until > Date.now()
                ? `Muitas consultas seguidas. Aguarde ${Math.ceil((until - Date.now()) / 1000)} segundos antes de tentar novamente.`
                : "Não foi possível carregar a monitoria de telefonia. Tente novamente."),
      });
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    controller.current!.reset();
    if (lastIdentity.current !== options.identityKey) {
      controller.current!.gate.retryAfterUntil = 0;
      setRetryAfterUntil(null);
      lastIdentity.current = options.identityKey;
    }
    setBusy(Boolean(options.enabled && options.token));
    if (options.enabled && options.token) controller.current!.request("query");
    return () => {
      mounted.current = false;
      controller.current!.dispose();
    };
  }, [queryKey]);

  useEffect(() => {
    const onVisibility = () => {
      if (!visible()) {
        controller.current!.suspend();
        setBusy(false);
      } else
        controller.current!.resume(result?.dataKey === latest.current.dataKey ? "auto" : "query");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);
    const timer = setInterval(() => controller.current!.request("auto"), 60_000);
    const unsubscribe = socket
      ? EVENTS.map((event) => socket.subscribe(event, () => controller.current!.request("auto")))
      : [];
    if (socket)
      unsubscribe.push(socket.subscribeConnection(() => controller.current!.request("auto")));
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
      clearInterval(timer);
      unsubscribe.forEach((remove) => remove());
    };
  }, [socket, result?.dataKey]);

  useEffect(() => {
    if (!options.autoRefresh || options.modalOpen) {
      controller.current!.pauseAutomatic();
      if (!controller.current!.busy) setBusy(false);
    } else if (hasResult) controller.current!.resume("auto");
  }, [options.autoRefresh, options.modalOpen]);

  const refetch = useCallback(() => controller.current!.request("manual"), []);
  const data = hasResult && options.enabled && options.token ? result!.data : null;
  return {
    items: data?.items ?? [],
    summary: data?.summary ?? null,
    totalCount: data?.totalCount ?? 0,
    error: errorState?.key === dataKey ? errorState.message : null,
    summaryError: null,
    isLoading: Boolean(options.enabled && options.token && !data && busy),
    isRefreshing: Boolean(data && busy),
    lastUpdatedAt: data ? result!.at : null,
    retryAfterUntil,
    refetch,
  };
}
