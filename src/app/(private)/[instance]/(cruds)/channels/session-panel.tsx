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
import VpnKeyIcon from "@mui/icons-material/VpnKey";
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
  sessionId: string | null;
  library: "BAILEYS" | "ZAPO" | null;
  monitorGroupId: string | null;
  monitorRole: "PRIMARY" | "SHADOW" | null;
  authBatchId: string | null;
  authQueueStatus: "WAITING" | "READY" | "ACTIVATING" | "QR_PENDING" | "FAILED" | null;
}

type AuthItemStatus =
  | "WAITING"
  | "READY"
  | "ACTIVATING"
  | "QR_PENDING"
  | "CONNECTED"
  | "FAILED"
  | "CANCELED";

interface AuthBatchItem {
  id: number;
  sessionId: string;
  clientId: number;
  instance: string;
  library: "BAILEYS" | "ZAPO";
  role: "PRIMARY" | "SHADOW";
  position: number;
  status: AuthItemStatus;
  attempts: number;
  lastError: string | null;
}

interface AuthBatch {
  id: string;
  groupId: string;
  groupName: string;
  expectedPhone: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELED" | "FAILED";
  items: AuthBatchItem[];
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
    socket.on(SocketEventType.WwebjsSessionStatus, onStatus);
    return () => socket.off(SocketEventType.WwebjsSessionStatus);
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

  const showGroupAuthentication = useCallback(
    (channel: ChannelSession) => {
      if (!channel.monitorGroupId) return;
      openModal(<AuthBatchWizard channel={channel} api={wppApi.current.ax} onClose={closeModal} />);
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
        {channel.monitorRole === "PRIMARY" && channel.monitorGroupId && (
          <Tooltip title="Autenticar grupo, uma sessão por vez">
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={busy}
                onClick={() => showGroupAuthentication(channel)}
              >
                <VpnKeyIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
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

function AuthBatchWizard({
  channel,
  api,
  onClose,
}: {
  channel: ChannelSession;
  api: AxiosInstance;
  onClose: () => void;
}) {
  const [batch, setBatch] = useState<AuthBatch | null>(null);
  const [qr, setQr] = useState<{ qr: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = `/api/whatsapp/session-monitor/clients/${channel.id}/auth-batches`;

  useEffect(() => {
    let active = true;
    const create = async () => {
      try {
        const response = await api.post<AuthBatch>(basePath, {
          monitorGroupId: channel.monitorGroupId,
        });
        if (active) setBatch(response.data);
      } catch (requestError) {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Falha ao iniciar a autenticação do grupo",
          );
      }
    };
    void create();
    return () => {
      active = false;
    };
  }, [api, basePath, channel.monitorGroupId]);

  useEffect(() => {
    if (!batch) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await api.get<AuthBatch>(`${basePath}/${batch.id}`);
        if (!active) return;
        setBatch(response.data);
        const current = response.data.items.find(
          (item) => item.status === "ACTIVATING" || item.status === "QR_PENDING",
        );
        if (!current) {
          setQr(null);
          return;
        }
        try {
          const qrResponse = await api.get<{ qr: string; expiresAt: string }>(
            `${basePath}/${batch.id}/qr`,
          );
          if (active) setQr(qrResponse.data);
        } catch {
          if (active) setQr(null);
        }
      } catch (requestError) {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Falha ao atualizar a fila de autenticação",
          );
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [api, basePath, batch?.id]);

  const activateNext = async () => {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<AuthBatch>(`${basePath}/${batch.id}/next`);
      setBatch(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Falha ao ativar a próxima sessão",
      );
    } finally {
      setBusy(false);
    }
  };

  const retry = async (item: AuthBatchItem) => {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<AuthBatch>(`${basePath}/${batch.id}/items/${item.id}/retry`);
      setBatch(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Falha ao preparar nova tentativa",
      );
    } finally {
      setBusy(false);
    }
  };

  const ready = batch?.items.find((item) => item.status === "READY");
  const current = batch?.items.find(
    (item) => item.status === "ACTIVATING" || item.status === "QR_PENDING",
  );
  const failed = batch?.items.find((item) => item.status === "FAILED");
  const completed = batch?.items.filter((item) => item.status === "CONNECTED").length || 0;
  const qrExpired = qr ? new Date(qr.expiresAt).getTime() <= Date.now() : false;

  return (
    <div className="max-h-[92dvh] w-[min(560px,94vw)] overflow-y-auto rounded-md bg-white p-5 text-slate-950 dark:bg-gray-900 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Autenticar grupo</h2>
          <p className="text-sm text-slate-500">{batch?.groupName || channel.monitorGroupId}</p>
        </div>
        <Button onClick={onClose}>Fechar</Button>
      </div>
      {batch && (
        <p className="mt-3 text-sm">
          Progresso:{" "}
          <strong>
            {completed} de {batch.items.length}
          </strong>{" "}
          sessões conectadas
        </p>
      )}
      {error && (
        <Alert severity="error" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="my-4 space-y-2">
        {batch?.items.map((item) => (
          <div
            key={item.id}
            className={`rounded border p-3 ${item.id === current?.id ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong>{item.instance}</strong>
                <p className="text-xs text-slate-500">
                  {item.library} · {item.role}
                </p>
              </div>
              <Chip
                size="small"
                color={
                  item.status === "CONNECTED"
                    ? "success"
                    : item.status === "FAILED"
                      ? "error"
                      : item.status === "QR_PENDING"
                        ? "info"
                        : "default"
                }
                label={item.status}
              />
            </div>
            {item.lastError && <p className="mt-2 text-xs text-red-600">{item.lastError}</p>}
          </div>
        ))}
      </div>

      {batch?.status === "COMPLETED" ? (
        <Alert severity="success">Todas as sessões do grupo foram autenticadas.</Alert>
      ) : current ? (
        <>
          <p className="text-center text-sm font-medium">
            Leia o QR de {current.instance} ({current.role})
          </p>
          <div className="mx-auto my-4 flex aspect-square w-[min(380px,80vw)] items-center justify-center bg-white p-3">
            {qr && !qrExpired ? (
              <QRCodeSVG value={qr.qr} className="h-full w-full" />
            ) : qrExpired ? (
              <Alert severity="warning">QR expirado; aguarde a renovação do provider.</Alert>
            ) : (
              <CircularProgress />
            )}
          </div>
        </>
      ) : failed ? (
        <div className="text-center">
          <Button variant="contained" disabled={busy} onClick={() => void retry(failed)}>
            Preparar nova tentativa
          </Button>
        </div>
      ) : ready ? (
        <div className="text-center">
          <p className="mb-3 text-sm">
            Prepare o telefone para autenticar <strong>{ready.instance}</strong>.
          </p>
          <Button
            variant="contained"
            startIcon={<QrCode2Icon />}
            disabled={busy}
            onClick={() => void activateNext()}
          >
            Gerar próximo QR
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <CircularProgress size={28} />
        </div>
      )}
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
