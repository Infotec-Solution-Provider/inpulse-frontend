"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SettingsIcon from "@mui/icons-material/Settings";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import FunnelProvider, { useFunnelContext } from "./funnel-context";
import FunnelBoard from "@/lib/components/funnel/FunnelBoard";

function FunnelPageContent() {
  const { funnelName, funnelType, loadBoard, loading, hasSnapshot, snapshotStatus, lastComputedAt, triggerRefresh } =
    useFunnelContext();
  const isManual = funnelType === "MANUAL";
  const router = useRouter();
  const params = useParams<{ instance: string; funnelId: string }>();

  useEffect(() => {
    loadBoard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isProcessing = snapshotStatus === "processing";

  return (
    <div className="flex h-full flex-col">
      {/* Processing progress bar */}
      {isProcessing && (
        <LinearProgress
          sx={{ height: 3, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}
        />
      )}

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton size="small" onClick={() => router.push(`/${params.instance}/funnel`)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-slate-800 dark:text-slate-100">
              {funnelName || "Pipeline"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isManual
                ? "Pipeline manual — adicione e mova clientes arrastando entre etapas."
                : isProcessing
                  ? "Gerando snapshot… isso pode levar alguns minutos."
                  : lastComputedAt
                    ? `Atualizado ${new Date(lastComputedAt).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}`
                    : "Nenhum snapshot gerado ainda."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tooltip title="Configurar estágios e condições">
            <IconButton
              size="small"
              onClick={() => router.push(`/${params.instance}/funnel/${params.funnelId}/config`)}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!isManual && (
            <Button
              variant="contained"
              size="small"
              startIcon={
                isProcessing
                  ? <CircularProgress size={14} color="inherit" />
                  : <AutorenewIcon />
              }
              disabled={isProcessing || loading}
              onClick={triggerRefresh}
            >
              {isProcessing ? "Processando…" : "Atualizar"}
            </Button>
          )}
        </div>
      </div>

      {/* Processing banner (automatic only) */}
      {!isManual && isProcessing && (
        <div className="flex shrink-0 items-center gap-2 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <CircularProgress size={14} color="inherit" />
          <span>Classificando clientes nos estágios... o board será atualizado automaticamente.</span>
        </div>
      )}

      {/* Board or empty state */}
      {!isManual && !hasSnapshot && !loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center text-slate-500 dark:text-slate-400">
            <AutorenewIcon sx={{ fontSize: 40, opacity: 0.4 }} />
            <div>
              <p className="font-medium">Nenhum dado disponível.</p>
              <p className="text-sm">Clique em &quot;Atualizar&quot; para gerar o primeiro snapshot.</p>
            </div>
            <Button variant="outlined" size="small" startIcon={<AutorenewIcon />} onClick={triggerRefresh}>
              Gerar agora
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden p-4 pt-3">
          <FunnelBoard />
        </div>
      )}
    </div>
  );
}

export default function FunnelBoardPage() {
  const params = useParams<{ funnelId: string }>();
  const funnelId = parseInt(params.funnelId, 10);

  return (
    <FunnelProvider funnelId={funnelId}>
      <FunnelPageContent />
    </FunnelProvider>
  );
}
