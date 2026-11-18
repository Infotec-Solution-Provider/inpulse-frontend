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
  ChevronDown,
  Clock3,
  Headset,
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
  const optionsButton = useRef<HTMLButtonElement>(null);
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
  const caption = scopeUnavailable
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
    if (working) return;
    setActionError(null);
    setOpen(true);
    void refresh();
  }
  const close = () => {
    if (!working) setOpen(false);
  };
  const needsAttention = uncertain || pbxUncertain || scopeUnavailable || status?.enabled === false;
  const headerLabel = exceeded && !pendingSync ? "Limite excedido" : label;
  const tone = exceeded ? "error" : paused || pending || needsAttention ? "warning" : "neutral";
  const activityIcon =
    pending || pendingSync || !status ? Clock3 : paused ? Pause : phone.busy ? Headset : CheckCircle2;
  const Icon = exceeded || (needsAttention && !paused && !pending && !pendingSync)
    ? TriangleAlert
    : activityIcon;
  const quickAction = paused ? "Retomar" : pending ? "Cancelar" : null;
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
        role="group"
        aria-label="Pausa do operador"
        aria-busy={working}
        sx={(theme) => ({
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
          borderRadius: 2,
          color: tone === "neutral" ? "var(--ip-text)" : theme.palette[tone].main,
          bgcolor:
            tone === "neutral" ? "var(--ip-surface-muted)" : alpha(theme.palette[tone].main, 0.12),
        })}
      >
        <Box
          component="span"
          role="status"
          sx={{
            position: "absolute",
            clipPath: "inset(50%)",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {headerLabel}
        </Box>
        <Tooltip title={`${headerLabel} · ${caption}`} describeChild>
          <Button
            ref={optionsButton}
            size="small"
            color="inherit"
            aria-label="Opções de pausa"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-disabled={working}
            onClick={showOptions}
            sx={{
              minWidth: 36,
              px: { xs: 0.75, sm: 1 },
              gap: 0.5,
              fontSize: 12,
              whiteSpace: "nowrap",
              "@media (pointer: coarse)": { minWidth: 44 },
            }}
          >
            <UiIcon icon={Icon} scale="metadata" />
            <Box component="span" aria-hidden="true" sx={{ display: { xs: "none", sm: "inline" } }}>
              {headerLabel}
            </Box>
            {(paused || pendingSync) && (
              <Box
                component="span"
                role="timer"
                aria-label="Tempo de pausa"
                sx={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
              >
                {seconds === null ? "—" : timer}
              </Box>
            )}
            {!quickAction && (
              <Box component="span" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                <UiIcon icon={ChevronDown} scale="metadata" />
              </Box>
            )}
          </Button>
        </Tooltip>
        {quickAction && (
          <Tooltip title={quickAction}>
            <span>
              <IconButton
                size="small"
                color="inherit"
                aria-label={quickAction}
                disabled={working}
                onClick={() => {
                  optionsButton.current?.focus();
                  void command(paused ? "resume" : "cancel_pending");
                }}
                sx={{ width: 36, height: 36 }}
              >
                <UiIcon icon={paused ? Play : X} scale="metadata" />
              </IconButton>
            </span>
          </Tooltip>
        )}
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
