"use client";

import { AuthContext } from "@/app/auth-context";
import { AppContext } from "@/app/(private)/[instance]/app-context";
import { SocketContext } from "@/app/(private)/[instance]/socket-context";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { SocketEventType, WWEBJSSessionStatusEventData } from "@/lib/sdk-local";
import HistoryIcon from "@mui/icons-material/History";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import RefreshIcon from "@mui/icons-material/Refresh";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { AxiosInstance } from "axios";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

interface SessionOperation {
  id: string;
  type: "RESTART" | "RESET_AUTH";
  startedAt: string;
}

interface SessionSnapshot {
  state: string;
  processStartedAt: string;
  stateChangedAt: string;
  lastActivityAt: string | null;
  connectedSince: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastDisconnectReason: string | null;
  reconnectAttempts: number;
  lastReconnectAt: string | null;
  lastObservedAt: string;
  currentOperationId: string | null;
  currentOperationType: SessionOperation["type"] | null;
  currentOperationStarted: string | null;
  consecutivePollFailures: number;
}

interface SessionEvent {
  id: number;
  previousState: string | null;
  state: string;
  reason: string | null;
  occurredAt: string;
  source: "WEBHOOK" | "POLL";
}

interface ChannelSession {
  id: number;
  name: string;
  phone: string | null;
  snapshot: SessionSnapshot | null;
  stability: "STABLE" | "ATTENTION" | "UNSTABLE" | "LOGGED_OUT" | "NO_DATA";
  stabilityReason: string;
  disconnections24h: number;
  connectedUptimeSeconds: number;
  events?: SessionEvent[];
}

const STATE_LABELS: Record<string, string> = {
  STARTING: "Iniciando",
  QR_PENDING: "Aguardando QR",
  CONNECTING: "Conectando",
  CONNECTED: "Conectado",
  RECONNECTING: "Reconectando",
  DISCONNECTED: "Desconectado",
  LOGGED_OUT: "Sessão encerrada",
  ERROR: "Erro",
};

const STABILITY_LABELS: Record<ChannelSession["stability"], string> = {
  STABLE: "Estável",
  ATTENTION: "Atenção",
  UNSTABLE: "Instável",
  LOGGED_OUT: "Sessão encerrada",
  NO_DATA: "Sem dados",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value),
  );
}

function relativeTime(value: string | null | undefined, now: number): string {
  if (!value) return "Sem atualização";
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
  return `há ${Math.floor(seconds / 86400)}d`;
}

function duration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}min`;
}

function StateChip({ state }: { state: string | undefined }) {
  const color =
    state === "CONNECTED"
      ? "success"
      : state === "ERROR" || state === "LOGGED_OUT"
        ? "error"
        : state === "DISCONNECTED"
          ? "warning"
          : "info";
  return (
    <Chip
      size="small"
      color={color}
      variant="outlined"
      label={state ? STATE_LABELS[state] || state : "Sem dados"}
    />
  );
}

function StabilityChip({ value }: { value: ChannelSession["stability"] }) {
  const color =
    value === "STABLE"
      ? "success"
      : value === "UNSTABLE" || value === "LOGGED_OUT"
        ? "error"
        : value === "ATTENTION"
          ? "warning"
          : "default";
  return <Chip size="small" color={color} label={STABILITY_LABELS[value]} />;
}

export default function ChannelSessionPanel() {
  const { token } = useContext(AuthContext);
  const { wppApi } = useContext(WhatsappContext);
  const { socket } = useContext(SocketContext);
  const { openModal, closeModal } = useContext(AppContext);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const [channels, setChannels] = useState<ChannelSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState<{ clientId: number; action: "restart" | "reset" } | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<{
    channel: ChannelSession;
    action: "restart" | "reset";
  } | null>(null);

  const loadChannels = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        wppApi.current.setAuth(token);
        const response = await wppApi.current.ax.get<ChannelSession[] | { data: ChannelSession[] }>(
          "/api/whatsapp/session-monitor/clients",
        );
        setChannels(Array.isArray(response.data) ? response.data : response.data.data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar os canais");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, wppApi],
  );

  useEffect(() => {
    void loadChannels();
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const poll = window.setInterval(() => {
      if (!document.hidden) void loadChannels(true);
    }, 30_000);
    const onVisibility = () => {
      if (!document.hidden) void loadChannels(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadChannels]);

  useEffect(() => {
    const onStatus = (status: WWEBJSSessionStatusEventData) => {
      setChannels((current) =>
        current.map((channel) =>
          channel.id === status.clientId
            ? {
                ...channel,
                phone: status.phone,
                snapshot: channel.snapshot
                  ? {
                      ...channel.snapshot,
                      state: status.state,
                      stateChangedAt: status.stateChangedAt,
                      lastObservedAt: status.lastObservedAt,
                      reconnectAttempts: status.reconnectAttempts,
                      currentOperationId: status.currentOperation?.id || null,
                      currentOperationType: status.currentOperation?.type || null,
                      currentOperationStarted: status.currentOperation?.startedAt || null,
                    }
                  : channel.snapshot,
              }
            : channel,
        ),
      );
      void loadChannels(true);
    };
    return socket.subscribe(SocketEventType.WwebjsSessionStatus, onStatus);
  }, [loadChannels, socket]);

  const newestObservation = useMemo(
    () =>
      channels.reduce<string | null>((latest, channel) => {
        const observed = channel.snapshot?.lastObservedAt;
        return observed && (!latest || new Date(observed) > new Date(latest)) ? observed : latest;
      }, null),
    [channels],
  );

  const showDetails = async (channel: ChannelSession) => {
    try {
      const response = await wppApi.current.ax.get<ChannelSession>(
        `/api/whatsapp/session-monitor/clients/${channel.id}`,
      );
      openModal(<SessionDetail channel={response.data} onClose={closeModal} />);
    } catch (detailError) {
      toast.error(
        detailError instanceof Error ? detailError.message : "Falha ao carregar o histórico",
      );
    }
  };

  const showQr = useCallback(
    (channel: ChannelSession) => {
      openModal(<SessionQr channel={channel} api={wppApi.current.ax} onClose={closeModal} />);
    },
    [closeModal, openModal, wppApi],
  );

  const executeAction = async () => {
    if (!confirmAction) return;
    const { channel, action } = confirmAction;
    setConfirmAction(null);
    setPending({ clientId: channel.id, action });
    try {
      if (action === "restart") {
        await wppApi.current.ax.post(`/api/whatsapp/session-monitor/clients/${channel.id}/restart`);
        toast.info("Reinício solicitado. A autenticação será preservada.");
      } else {
        await wppApi.current.ax.post(
          `/api/whatsapp/session-monitor/clients/${channel.id}/reset-qr`,
          { confirm: true },
        );
        showQr(channel);
      }
      await loadChannels(true);
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : "Falha ao executar a operação",
      );
    } finally {
      setPending(null);
    }
  };

  const actions = (channel: ChannelSession) => {
    const busy = !!channel.snapshot?.currentOperationId || pending?.clientId === channel.id;
    return (
      <div className="flex min-w-[132px] justify-end gap-1">
        <Tooltip title="Histórico de 24 horas">
          <span>
            <IconButton size="small" onClick={() => void showDetails(channel)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Reiniciar sessão">
          <span>
            <IconButton
              size="small"
              disabled={busy}
              onClick={() => setConfirmAction({ channel, action: "restart" })}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Gerar novo QR">
          <span>
            <IconButton
              size="small"
              color="error"
              disabled={busy}
              onClick={() => setConfirmAction({ channel, action: "reset" })}
            >
              <QrCode2Icon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-950 dark:bg-gray-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-semibold">Canais WhatsApp</h1>
            <p
              className="mt-1 text-sm text-slate-600 dark:text-slate-300"
              title={formatDate(newestObservation)}
            >
              Última atualização: {relativeTime(newestObservation, now)}
            </p>
          </div>
          <Tooltip title="Atualizar canais">
            <span>
              <IconButton onClick={() => void loadChannels()} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>

        {error && (
          <Alert severity="warning" className="mb-4">
            {error}. Os últimos dados permanecem visíveis.
          </Alert>
        )}
        {loading && channels.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center">
            <CircularProgress size={30} />
          </div>
        ) : channels.length === 0 ? (
          <Alert severity="info">Nenhum canal remoto está disponível para este setor.</Alert>
        ) : mobile ? (
          <div className="grid gap-3">
            {channels.map((channel) => (
              <article
                key={channel.id}
                className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{channel.name}</h2>
                    <p className="text-sm text-slate-500">{channel.phone || "Sem telefone"}</p>
                  </div>
                  {actions(channel)}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StateChip state={channel.snapshot?.state} />
                  <StabilityChip value={channel.stability} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Conexão</span>
                    <p>{duration(channel.connectedUptimeSeconds)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Quedas em 24h</span>
                    <p>{channel.disconnections24h}</p>
                  </div>
                </div>
                <p
                  className="mt-3 text-xs text-slate-500"
                  title={formatDate(channel.snapshot?.lastObservedAt)}
                >
                  Atualizado {relativeTime(channel.snapshot?.lastObservedAt, now)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <TableContainer className="rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900">
            <Table stickyHeader sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Canal</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Estabilidade</TableCell>
                  <TableCell>Conexão atual</TableCell>
                  <TableCell>Quedas 24h</TableCell>
                  <TableCell>Última atualização</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channels.map((channel) => {
                  const stale =
                    channel.snapshot &&
                    now - new Date(channel.snapshot.lastObservedAt).getTime() > 90_000;
                  return (
                    <TableRow key={channel.id} hover>
                      <TableCell>
                        <strong>{channel.name}</strong>
                        <div className="text-xs text-slate-500">
                          {channel.phone || "Sem telefone"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StateChip state={channel.snapshot?.state} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={channel.stabilityReason}>
                          <span>
                            <StabilityChip value={channel.stability} />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{duration(channel.connectedUptimeSeconds)}</TableCell>
                      <TableCell>{channel.disconnections24h}</TableCell>
                      <TableCell>
                        <span title={formatDate(channel.snapshot?.lastObservedAt)}>
                          {relativeTime(channel.snapshot?.lastObservedAt, now)}
                        </span>
                        {stale && (
                          <div className="text-xs font-medium text-amber-700">
                            Dados desatualizados
                          </div>
                        )}
                      </TableCell>
                      <TableCell align="right">{actions(channel)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>

      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {confirmAction?.action === "reset" ? "Gerar novo QR code?" : "Reiniciar sessão?"}
        </DialogTitle>
        <DialogContent>
          {confirmAction?.action === "reset"
            ? "O aparelho atual será desvinculado e será necessário ler um novo QR code."
            : "O socket será recriado sem remover a autenticação atual."}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>Cancelar</Button>
          <Button
            color={confirmAction?.action === "reset" ? "error" : "primary"}
            variant="contained"
            onClick={() => void executeAction()}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function SessionDetail({ channel, onClose }: { channel: ChannelSession; onClose: () => void }) {
  return (
    <div className="max-h-[85dvh] w-[min(720px,92vw)] overflow-y-auto rounded-md bg-white p-5 text-slate-950 dark:bg-gray-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{channel.name}</h2>
          <p className="text-sm text-slate-500">Janela de estabilidade: 24 horas</p>
        </div>
        <Button onClick={onClose}>Fechar</Button>
      </div>
      <div className="my-5 grid gap-3 border-y border-slate-200 py-4 dark:border-slate-700 sm:grid-cols-3">
        <div>
          <span className="text-xs text-slate-500">Processo iniciado</span>
          <p className="text-sm">{formatDate(channel.snapshot?.processStartedAt)}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Última conexão</span>
          <p className="text-sm">{formatDate(channel.snapshot?.lastConnectedAt)}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">Última desconexão</span>
          <p className="text-sm">{formatDate(channel.snapshot?.lastDisconnectedAt)}</p>
        </div>
      </div>
      <h3 className="font-semibold">Transições recentes</h3>
      {channel.events?.length ? (
        <List dense>
          {channel.events.map((event) => (
            <ListItem key={event.id} divider>
              <ListItemText
                primary={STATE_LABELS[event.state] || event.state}
                secondary={`${formatDate(event.occurredAt)}${event.reason ? ` · ${event.reason}` : ""}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Nenhuma transição registrada nas últimas 24 horas.
        </p>
      )}
    </div>
  );
}

function SessionQr({
  channel,
  api,
  onClose,
}: {
  channel: ChannelSession;
  api: AxiosInstance;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [state, setState] = useState("CONNECTING");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [listResponse, qrResponse] = await Promise.allSettled([
          api.get<ChannelSession[]>("/api/whatsapp/session-monitor/clients"),
          api.get(`/api/whatsapp/session-monitor/clients/${channel.id}/qr`),
        ]);
        if (!active) return;
        if (listResponse.status === "fulfilled") {
          const current = listResponse.value.data.find((item) => item.id === channel.id);
          if (current?.snapshot?.state) setState(current.snapshot.state);
          if (current?.snapshot?.state === "CONNECTED") {
            toast.success(`${channel.name} conectado com sucesso.`);
            onClose();
            return;
          }
        }
        if (qrResponse.status === "fulfilled") {
          setQr(qrResponse.value.data.qr);
          setExpired(new Date(qrResponse.value.data.expiresAt).getTime() <= Date.now());
        }
      } catch {
        // O próximo ciclo recupera falhas transitórias.
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [api, channel.id, channel.name, onClose]);

  return (
    <div className="w-[min(440px,92vw)] rounded-md bg-white p-5 text-center text-slate-950 dark:bg-gray-900 dark:text-slate-100">
      <h2 className="text-xl font-semibold">{channel.name}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {state === "QR_PENDING"
          ? "Aguardando leitura"
          : state === "CONNECTED"
            ? "Conectado"
            : "Preparando sessão"}
      </p>
      <div className="my-5 flex aspect-square w-full items-center justify-center bg-white p-3">
        {qr && !expired ? (
          <QRCodeSVG value={qr} className="h-full w-full" />
        ) : expired ? (
          <Alert severity="warning">QR expirado. Feche e solicite um novo código.</Alert>
        ) : (
          <CircularProgress />
        )}
      </div>
      <Button onClick={onClose}>Fechar</Button>
    </div>
  );
}
