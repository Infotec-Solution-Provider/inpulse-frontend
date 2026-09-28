import { useCallback, useEffect, useRef, useState } from "react";
import monitorService from "@/lib/services/monitor.service";
import { readRequestLimitMessage } from "@/lib/utils/read-request-limit";
import type SocketClient from "@/lib/sdk-local/socket.client";
import { SocketEventType } from "@/lib/sdk-local/types/socket-events.types";
import { MonitorRequestGate } from "./request-gate";
import type { MonitorFiltersState, MonitorItem, MonitorSummary } from "./types";

const AUTO_THROTTLE_MS = 5_000;
const FALLBACK_MS = 60_000;
const EVENTS = [
  SocketEventType.WppChatStarted,
  SocketEventType.WppChatFinished,
  SocketEventType.WppChatTransfer,
  SocketEventType.WppMessage,
  SocketEventType.WppMessageEdit,
  SocketEventType.WppMessageDelete,
  SocketEventType.WppMessageStatus,
  SocketEventType.WppContactMessagesRead,
  SocketEventType.InternalChatStarted,
  SocketEventType.InternalChatFinished,
  SocketEventType.InternalMessage,
  SocketEventType.InternalMessageEdit,
  SocketEventType.InternalMessageDelete,
  SocketEventType.InternalMessageStatus,
];
type RefreshKind = "query" | "manual" | "auto";
interface Options {
  token: string | null;
  filters: MonitorFiltersState;
  page: number;
  pageSize: number;
  autoRefresh: boolean;
  modalOpen: boolean;
  socket: SocketClient | undefined;
  onPageOverflow: (page: number) => void;
}

export function useMonitorData(options: Options) {
  const [chats, setChats] = useState<MonitorItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<MonitorSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [retryAfterUntil, setRetryAfterUntil] = useState<number | null>(null);
  const gate = useRef(new MonitorRequestGate());
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<RefreshKind | null>(null);
  const activeKind = useRef<RefreshKind | null>(null);
  const lastStarted = useRef(0);
  const hasLoaded = useRef(false);
  const summaryKeyLoaded = useRef<string | null>(null);
  const previousDataKey = useRef<string | null>(null);
  const previousSummaryFiltersKey = useRef<string | null>(null);
  const dataKey = JSON.stringify([options.page, options.pageSize, options.filters]);
  const queryKey = JSON.stringify([options.token, options.page, options.pageSize, options.filters]);
  const latest = useRef({ ...options, queryKey });
  latest.current = { ...options, queryKey };
  const run = useRef<(kind: RefreshKind) => void>(() => undefined);
  const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
  const canAuto = () => latest.current.autoRefresh && !latest.current.modalOpen && visible();

  const schedule = useCallback((kind: RefreshKind) => {
    if (!mounted.current || !latest.current.token) return;
    if (kind === "auto" && !canAuto()) return;
    if (kind !== "auto" || pending.current === null) pending.current = kind;
    if (timer.current && kind !== "auto") {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (timer.current || gate.current.busy || !visible()) return;
    const throttleUntil = kind === "auto" ? lastStarted.current + AUTO_THROTTLE_MS : 0;
    const delay = Math.max(
      0,
      throttleUntil - Date.now(),
      gate.current.retryAfterUntil - Date.now(),
    );
    timer.current = setTimeout(() => {
      timer.current = null;
      const next = pending.current;
      pending.current = null;
      if (next) run.current(next);
    }, delay);
  }, []);

  run.current = async (kind) => {
    if (!mounted.current || !latest.current.token || !visible() || (kind === "auto" && !canAuto()))
      return;
    const ticket = gate.current.begin();
    if (!ticket) {
      schedule(kind);
      return;
    }
    const request = latest.current;
    const isCurrent = () =>
      mounted.current &&
      gate.current.isCurrent(ticket) &&
      latest.current.queryKey === request.queryKey &&
      (kind !== "auto" || canAuto());
    const summaryKey = JSON.stringify([
      request.token,
      { ...request.filters, operationalStatus: "all" },
    ]);
    const loadSummary = kind !== "query" || summaryKeyLoaded.current !== summaryKey;
    activeKind.current = kind;
    lastStarted.current = Date.now();
    setIsLoading(!hasLoaded.current);
    setIsRefreshing(hasLoaded.current);
    setRetryAfterUntil(null);
    const recordFailure = (failure: unknown, isSummary: boolean) => {
      if (!isCurrent()) return;
      const until = gate.current.recordFailure(failure);
      if (until > Date.now()) setRetryAfterUntil(until);
      const message =
        readRequestLimitMessage(failure) ||
        (isSummary
          ? "Não foi possível atualizar os indicadores. Tente novamente."
          : "Não foi possível carregar a monitoria. Tente novamente.");
      if (isSummary) setSummaryError(message);
      else setError(message);
    };
    const tasks = [
      monitorService
        .search(
          { page: request.page, pageSize: request.pageSize, filters: request.filters },
          ticket.controller.signal,
        )
        .then((result) => {
          if (!isCurrent()) return;
          const lastPage = Math.max(1, Math.ceil(result.totalCount / request.pageSize));
          if (request.page > lastPage) {
            request.onPageOverflow(lastPage);
            return;
          }
          setChats(result.items);
          setTotalCount(result.totalCount);
          setLastUpdatedAt(Date.now());
          setError(null);
          hasLoaded.current = true;
        })
        .catch((failure) => recordFailure(failure, false)),
    ];
    if (loadSummary)
      tasks.push(
        monitorService
          .summary(request.filters, ticket.controller.signal)
          .then((result) => {
            if (!isCurrent()) return;
            setSummary(result);
            setSummaryError(null);
            summaryKeyLoaded.current = summaryKey;
          })
          .catch((failure) => recordFailure(failure, true)),
      );
    await Promise.allSettled(tasks);
    if (!isCurrent()) return;
    gate.current.complete(ticket);
    activeKind.current = null;
    setIsLoading(false);
    setIsRefreshing(false);
    if (pending.current) schedule(pending.current);
  };

  useEffect(() => {
    mounted.current = true;
    gate.current.invalidate();
    activeKind.current = null;
    // Token renewal invalidates old requests but keeps the same user's displayed result stable.
    if (previousDataKey.current !== dataKey || !options.token) {
      hasLoaded.current = false;
      setChats([]);
      setTotalCount(0);
      setError(null);
      setLastUpdatedAt(null);
    }
    previousDataKey.current = dataKey;
    setIsLoading(Boolean(options.token) && !hasLoaded.current);
    setIsRefreshing(Boolean(options.token) && hasLoaded.current);
    const summaryFiltersKey = JSON.stringify({ ...options.filters, operationalStatus: "all" });
    if (previousSummaryFiltersKey.current !== summaryFiltersKey || !options.token) {
      setSummary(null);
      setSummaryError(null);
    }
    previousSummaryFiltersKey.current = summaryFiltersKey;
    schedule("query");
    return () => {
      mounted.current = false;
      gate.current.invalidate();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current = null;
    };
  }, [queryKey, schedule]);

  useEffect(() => {
    const onVisibility = () => {
      if (!visible()) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        if (gate.current.busy) {
          // Keep a queued explicit refresh when an automatic batch is interrupted by visibility.
          if (pending.current !== "manual" && pending.current !== "query") {
            pending.current = activeKind.current === "auto" ? "auto" : "query";
          }
          gate.current.invalidate();
          activeKind.current = null;
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return;
      }
      if (pending.current) schedule(pending.current);
      else if (!hasLoaded.current) schedule("query");
      else schedule("auto");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);
    const fallback = setInterval(() => schedule("auto"), FALLBACK_MS);
    const remove = options.socket
      ? EVENTS.map((event) => options.socket!.subscribe(event, () => schedule("auto")))
      : [];
    if (options.socket) remove.push(options.socket.subscribeConnection(() => schedule("auto")));
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
      clearInterval(fallback);
      remove.forEach((unsubscribe) => unsubscribe());
    };
  }, [options.socket, schedule]);

  useEffect(() => {
    if (!options.autoRefresh || options.modalOpen) {
      if (pending.current === "auto") {
        pending.current = null;
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
      }
      if (activeKind.current === "auto") {
        gate.current.invalidate();
        activeKind.current = null;
        setIsLoading(false);
        setIsRefreshing(false);
        if (pending.current) schedule(pending.current);
      }
    } else if (hasLoaded.current) schedule("auto");
  }, [options.autoRefresh, options.modalOpen, schedule]);

  const refetch = useCallback(() => schedule("manual"), [schedule]);
  return {
    chats,
    totalCount,
    summary,
    error,
    summaryError,
    isLoading,
    isRefreshing,
    lastUpdatedAt,
    retryAfterUntil,
    refetch,
  };
}
