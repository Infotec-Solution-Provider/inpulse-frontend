"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  CheckCircle2,
  Clock3,
  Ellipsis,
  Pause,
  Play,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";
import { useOptionalTelephony } from "@/lib/telephony/telephony-provider";
import { TelephonyDialogTitle } from "@/lib/telephony/dialog-title";
import { UiIcon } from "@/lib/ui-system/icons";

type Phone = NonNullable<ReturnType<typeof useOptionalTelephony>>;
const duration = (seconds: number) =>
  [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, Math.floor(seconds) % 60]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

/** One persistent control for the operator, shared by every private route. */
export function OperatorPause() {
  const phone = useOptionalTelephony();
  return phone?.canAccessOperatorRuntime && (phone.enabled || phone.operatorState?.enabled) ? (
    <PauseControl phone={phone} />
  ) : null;
}

function PauseControl({ phone }: { phone: Phone }) {
  const status = phone.operatorState;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(0);
  const [working, setWorking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const alive = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);
  const current = useRef(phone);
  current.current = phone;

  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    setRefreshing(true);
    const request = phone.runtime
      .refreshState()
      .then(() => {
        if (alive.current) setRefreshError(null);
      })
      .catch(() => {
        if (alive.current)
          setRefreshError("Não foi possível conferir a pausa. Tente atualizar o estado.");
      })
      .finally(() => {
        inFlight.current = null;
        if (alive.current) setRefreshing(false);
      });
    inFlight.current = request;
    return request;
  }, [phone.runtime]);

  useEffect(() => {
    alive.current = true;
    const update = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      alive.current = false;
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  useEffect(() => {
    if (status?.serverNow) setRefreshError(null);
  }, [status?.serverNow]);
  useEffect(() => {
    if (open) setReason(status?.reasonId ?? 0);
  }, [open, status?.state, status?.reasonId]);

  const serverOffset = useMemo(() => {
    const timestamp = Date.parse(status?.serverNow ?? "");
    return Number.isFinite(timestamp) ? timestamp - Date.now() : 0;
  }, [status?.serverNow]);
  const paused = !!status?.enabled && status.state === "paused";
  const pending = !!status?.enabled && status.state === "pending";
  const pendingSync = !!status?.pendingSync;
  useEffect(() => {
    if (!paused && !pendingSync) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paused, pendingSync]);
  const started = Date.parse(status?.startedAt ?? "");
  const seconds = Number.isFinite(started)
    ? Math.max(0, Math.floor((now + serverOffset - started) / 1000))
    : null;
  const exceeded =
    paused && !!status?.maxSeconds && seconds !== null && seconds > status.maxSeconds;
  const reasonName =
    status?.reason || status?.reasons.find((item) => item.id === status.reasonId)?.name || "";
  const pbxUncertain =
    !!status?.pbx && ["pending", "failed", "unknown"].includes(status.pbx.status);
  const globalScopeRequested =
    status?.requestedScope === "all_channels" || status?.scope === "all_channels";
  const globalScopeConfirmed =
    status?.scope === "all_channels" &&
    status.scopeReady === true &&
    status.channels?.telephony?.supported === true &&
    status.channels.telephony.enforced === true &&
    status.channels.whatsapp?.supported === true &&
    status.channels.whatsapp.enforced === true;
  const scopeUnavailable = globalScopeRequested && !globalScopeConfirmed;
  const scopeName = globalScopeConfirmed ? "Ligações e WhatsApp" : "Telefonia";
  const afterAttendanceSupported =
    !globalScopeRequested || status?.afterAttendanceScope === "telephony_schedule";
  const uncertain = !!refreshError || !!phone.syncError || pendingSync;
  const available = !!status?.enabled && status.state === "available" && !pendingSync;
  const label = pendingSync
    ? "Retomada pendente"
    : paused
      ? "Em pausa"
      : pending
        ? "Pausa solicitada"
        : !status
          ? uncertain
            ? "Pausa indisponível"
            : "Conferindo pausa…"
          : !status.enabled
            ? "Pausa indisponível"
            : uncertain || scopeUnavailable
              ? "Conferir estado"
              : phone.busy
                ? "Em atendimento"
                : "Disponível";
  const caption = exceeded
    ? `Limite excedido${reasonName ? ` · ${reasonName}` : ""}`
    : scopeUnavailable
      ? "WhatsApp não confirmado"
      : pending
        ? `Após atendimento telefônico${reasonName ? ` · ${reasonName}` : ""}`
        : pendingSync
          ? "Aguardando sincronização"
          : paused
            ? `${reasonName ? `${reasonName} · ` : ""}${scopeName}${pbxUncertain ? " · Central pendente" : ""}`
            : uncertain
              ? "Há pendências na sincronização"
              : pbxUncertain
                ? `${scopeName} · Central pendente`
                : scopeName;

  async function command(kind: string) {
    if (working) return;
    setWorking(true);
    setActionError(null);
    try {
      const needsReason = ["now", "after_attendance", "change_reason"].includes(kind);
      await current.current.runtime.commandPause(
        kind,
        needsReason ? reason || undefined : undefined,
      );
      if (alive.current && kind !== "retry_pbx") setOpen(false);
    } catch (error) {
      if (alive.current) {
        setActionError(
          error instanceof Error ? error.message : "Não foi possível confirmar a pausa.",
        );
        setOpen(true);
      }
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  function showOptions() {
    setActionError(null);
    setOpen(true);
    void refresh();
  }
  const close = () => {
    if (!working) setOpen(false);
  };
  const Icon =
    exceeded || uncertain || pbxUncertain || scopeUnavailable
      ? TriangleAlert
      : paused
        ? Pause
        : pending
          ? Clock3
          : CheckCircle2;
  const timer = seconds === null ? "Tempo indisponível" : duration(seconds);
  const pbxLabel = status?.pbx
    ? (
        {
          pending: "Aguardando confirmação da central",
          confirmed: "Central sincronizada",
          failed: "Falha ao sincronizar a central",
          unknown: "Confirmação da central pendente",
        } as Record<string, string>
      )[status.pbx.status]
    : null;

  return (
    <>
      <Box
        component="section"
        aria-label="Pausa do operador"
        aria-busy={working}
        sx={(theme) => ({
          flexShrink: 0,
          minWidth: 0,
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: { xs: 1.5, md: 3 },
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: exceeded
            ? alpha(theme.palette.error.main, 0.4)
            : paused || pending
              ? alpha(theme.palette.warning.main, 0.3)
              : "var(--ip-border)",
          bgcolor: exceeded
            ? alpha(theme.palette.error.main, 0.12)
            : paused || pending
              ? alpha(theme.palette.warning.main, 0.12)
              : "var(--ip-surface, #fff)",
          color: "var(--ip-text, inherit)",
        })}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
          <UiIcon icon={Icon} scale="toolbar" style={{ flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Typography
                role="status"
                aria-live="polite"
                title={label}
                noWrap
                sx={{ fontSize: 13, fontWeight: 700, minWidth: 0 }}
              >
                {label}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Typography
                noWrap
                title={caption}
                sx={{ fontSize: 11, color: "var(--ip-muted, inherit)", minWidth: 0 }}
              >
                {caption}
              </Typography>
              {(paused || pendingSync) && (
                <Typography
                  component="span"
                  role="timer"
                  aria-label="Tempo de pausa"
                  aria-live="off"
                  sx={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {seconds === null ? "—" : timer}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
          <Button
            size="small"
            variant={paused ? "contained" : "outlined"}
            startIcon={
              <UiIcon
                icon={
                  paused ? Play : pending ? X : !status?.enabled || pendingSync ? RefreshCw : Pause
                }
              />
            }
            disabled={working || ((!status?.enabled || pendingSync) && refreshing)}
            onClick={() => {
              if (paused) void command("resume");
              else if (pending) void command("cancel_pending");
              else if (!status?.enabled || pendingSync) void refresh();
              else showOptions();
            }}
            sx={{ minHeight: 36, textTransform: "none", whiteSpace: "nowrap", px: 1.25 }}
          >
            {paused
              ? "Retomar"
              : pending
                ? "Cancelar"
                : !status?.enabled || pendingSync
                  ? "Atualizar"
                  : uncertain || scopeUnavailable
                    ? "Conferir"
                    : "Pausar"}
          </Button>
          <Tooltip title="Opções de pausa">
            <IconButton
              size="small"
              aria-label="Opções de pausa"
              aria-haspopup="dialog"
              aria-expanded={open}
              disabled={working}
              onClick={showOptions}
              sx={{ width: 36, height: 36 }}
            >
              <UiIcon icon={Ellipsis} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="xs"
        aria-labelledby="operator-pause-title"
      >
        <TelephonyDialogTitle id="operator-pause-title" onClose={close} closeDisabled={working}>
          Pausa
        </TelephonyDialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {globalScopeConfirmed
                ? "A pausa bloqueia novas ligações e novos atendimentos no WhatsApp. Você pode responder e concluir as conversas já abertas."
                : "A pausa suspende novas ligações. Mensagens e outras áreas continuam disponíveis."}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Escopo confirmado: {scopeName}.
            </Typography>
            {scopeUnavailable && (
              <Alert severity="warning">
                Não foi possível confirmar o bloqueio de novos atendimentos no WhatsApp. Atualize o
                estado antes de solicitar uma nova pausa. Retomar ou cancelar uma pausa continua
                disponível.
              </Alert>
            )}
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
                {label}
                {reasonName ? ` · ${reasonName}` : ""}
              </Typography>
              {paused && (
                <>
                  <Typography
                    sx={{
                      fontSize: 24,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      mt: 0.5,
                    }}
                  >
                    {timer}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {status?.maxSeconds
                      ? `Limite previsto: ${duration(status.maxSeconds)}`
                      : "Sem limite de tempo"}
                  </Typography>
                </>
              )}
            </Box>
            {exceeded && <Alert severity="warning">Tempo previsto de pausa excedido.</Alert>}
            {pending && (
              <Alert severity="info">
                {globalScopeConfirmed
                  ? "Novos atendimentos no WhatsApp já estão bloqueados. O tempo de pausa começará depois de salvar a finalização do atendimento telefônico atual."
                  : "A pausa começará depois de salvar a finalização do atendimento telefônico atual."}
              </Alert>
            )}
            {pendingSync && (
              <Alert severity="warning">
                A retomada ainda precisa ser confirmada. Atualize o estado para conferir.
              </Alert>
            )}
            {actionError && <Alert severity="error">{actionError}</Alert>}
            {refreshError && <Alert severity="warning">{refreshError}</Alert>}
            {phone.syncError && <Alert severity="warning">{phone.syncError}</Alert>}
            {!status?.enabled && (
              <Alert severity="info">A pausa ainda não está disponível para esta empresa.</Alert>
            )}
            {status?.enabled && !pending && (!paused || status.allowChangeReason) && (
              <TextField
                select
                label={paused ? "Novo motivo da pausa" : "Motivo da pausa"}
                size="small"
                fullWidth
                value={reason}
                disabled={working || pendingSync}
                onChange={(event) => setReason(Number(event.target.value))}
              >
                <MenuItem value={0}>Selecione</MenuItem>
                {status.reasons.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {available && (
              <>
                {status.activeCallId && !phone.busy && (
                  <Alert severity="warning">
                    Há uma ligação pendente de conferência. Abra o telefone para verificar antes de
                    pausar.
                  </Alert>
                )}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  <Button
                    variant="contained"
                    disabled={
                      working || !reason || phone.busy || !!status.activeCallId || scopeUnavailable
                    }
                    onClick={() => void command("now")}
                  >
                    Pausar agora
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={
                      working ||
                      !reason ||
                      !phone.state.scheduleId ||
                      scopeUnavailable ||
                      !afterAttendanceSupported
                    }
                    onClick={() => void command("after_attendance")}
                  >
                    Após atendimento telefônico
                  </Button>
                </Box>
                {!phone.state.scheduleId && (
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    “Após atendimento telefônico” fica disponível durante um atendimento telefônico.
                  </Typography>
                )}
              </>
            )}
            {paused && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<UiIcon icon={Play} />}
                  disabled={working}
                  onClick={() => void command("resume")}
                >
                  Retomar
                </Button>
                {status?.allowChangeReason && (
                  <Button
                    variant="outlined"
                    disabled={working || !reason || reason === status.reasonId}
                    onClick={() => void command("change_reason")}
                  >
                    Trocar motivo
                  </Button>
                )}
              </Box>
            )}
            {pending && (
              <Button
                variant="outlined"
                disabled={working}
                onClick={() => void command("cancel_pending")}
              >
                Cancelar pausa agendada
              </Button>
            )}
            {pbxLabel && (
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{pbxLabel}</Typography>
            )}
            {status?.pbx && ["failed", "unknown"].includes(status.pbx.status) && (
              <Button disabled={working} onClick={() => void command("retry_pbx")}>
                Sincronizar central
              </Button>
            )}
            <Button
              size="small"
              startIcon={<UiIcon icon={RefreshCw} />}
              disabled={working || refreshing}
              onClick={() => void refresh()}
            >
              Atualizar estado
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
