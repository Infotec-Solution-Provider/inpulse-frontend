"use client";

import { Profiler, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import SettingsIcon from "@mui/icons-material/Settings";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import FunnelProvider, { useFunnelContext } from "./funnel-context";
import FunnelBoard from "@/lib/components/funnel/FunnelBoard";
import funnelApiService, { type FunnelFilterOptions } from "@/lib/services/funnel.service";
import { useAuthContext } from "@/app/auth-context";
import type { FunnelBoardFilters } from "@/lib/types/funnel.types";

function FunnelPageContent() {
  const {
    funnelName,
    funnelType,
    boardTraceId,
    filters,
    loading,
    hasSnapshot,
    snapshotStatus,
    lastComputedAt,
    triggerRefresh,
    applyFilters,
    resetFilters,
  } =
    useFunnelContext();
  const isManual = funnelType === "MANUAL";
  const router = useRouter();
  const params = useParams<{ instance: string; funnelId: string }>();
  const { token } = useAuthContext();
  const [draftFilters, setDraftFilters] = useState<FunnelBoardFilters>(filters);
  const [groupTags, setGroupTags] = useState<string[]>(() =>
    filters.groupQuery ? filters.groupQuery.split("|").filter(Boolean) : [],
  );
  const [operatorTags, setOperatorTags] = useState<string[]>(() =>
    filters.operatorQuery ? filters.operatorQuery.split("|").filter(Boolean) : [],
  );
  const [campanhaTags, setCampanhaTags] = useState<string[]>(() =>
    filters.campaignQuery ? filters.campaignQuery.split("|").filter(Boolean) : [],
  );
  const [segmentTags, setSegmentTags] = useState<string[]>(() =>
    filters.segmentQuery ? filters.segmentQuery.split("|").filter(Boolean) : [],
  );
  const [filterOptions, setFilterOptions] = useState<FunnelFilterOptions>({
    groups: [],
    operators: [],
    campaigns: [],
    segments: [],
  });

  useEffect(() => {
    setDraftFilters(filters);
    setGroupTags(filters.groupQuery ? filters.groupQuery.split("|").filter(Boolean) : []);
    setOperatorTags(filters.operatorQuery ? filters.operatorQuery.split("|").filter(Boolean) : []);
    setCampanhaTags(filters.campaignQuery ? filters.campaignQuery.split("|").filter(Boolean) : []);
    setSegmentTags(filters.segmentQuery ? filters.segmentQuery.split("|").filter(Boolean) : []);
  }, [filters]);

  useEffect(() => {
    if (!token) return;
    const funnelId = parseInt(params.funnelId, 10);
    funnelApiService.getFunnelFilterOptions(token, funnelId)
      .then((data) => setFilterOptions(data))
      .catch(() => { /* silently ignore — fields remain empty */ });
  }, [token, params.funnelId]);

  const isProcessing = snapshotStatus === "processing";
  const activeFiltersCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => {
      if (key === "sortBy") return value !== "ultimoContato";
      if (key === "sortOrder") return value !== "desc";
      return value !== "";
    }).length,
    [filters],
  );

  const handleFilterChange = (field: keyof FunnelBoardFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = async () => {
    await applyFilters(draftFilters);
  };

  const handleResetFilters = async () => {
    await resetFilters();
  };


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

      <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <Autocomplete
          multiple
          freeSolo
          options={["__NULL__", ...filterOptions.groups.map((g) => g.name)]}
          value={groupTags}
          onChange={(_e, newTags) => {
            const tags = newTags as string[];
            setGroupTags(tags);
            setDraftFilters((prev) => ({ ...prev, groupQuery: tags.join("|") }));
          }}
          getOptionLabel={(option) => option === "__NULL__" ? "Sem Grupo" : option}
          size="small"
          sx={{ minWidth: 200 }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option === "__NULL__" ? "Sem Grupo" : option} {...getTagProps({ index })} size="small" key={index} />
            ))
          }
          renderInput={(inputParams) => <TextField {...inputParams} label="Grupo" />}
        />
        <Autocomplete
          multiple
          freeSolo
          options={["__NULL__", ...filterOptions.segments.map((s) => s.name)]}
          value={segmentTags}
          onChange={(_e, newTags) => {
            const tags = newTags as string[];
            setSegmentTags(tags);
            setDraftFilters((prev) => ({ ...prev, segmentQuery: tags.join("|") }));
          }}
          getOptionLabel={(option) => option === "__NULL__" ? "Sem Segmento" : option}
          size="small"
          sx={{ minWidth: 180 }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option === "__NULL__" ? "Sem Segmento" : option} {...getTagProps({ index })} size="small" key={index} />
            ))
          }
          renderInput={(inputParams) => <TextField {...inputParams} label="Segmento" />}
        />
        <Autocomplete
          multiple
          freeSolo
          options={["__NULL__", ...filterOptions.operators.map((o) => o.name)]}
          value={operatorTags}
          onChange={(_e, newTags) => {
            const tags = newTags as string[];
            setOperatorTags(tags);
            setDraftFilters((prev) => ({ ...prev, operatorQuery: tags.join("|") }));
          }}
          getOptionLabel={(option) => option === "__NULL__" ? "Sem Operador" : option}
          size="small"
          sx={{ minWidth: 200 }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option === "__NULL__" ? "Sem Operador" : option} {...getTagProps({ index })} size="small" key={index} />
            ))
          }
          renderInput={(inputParams) => <TextField {...inputParams} label="Operador" />}
        />
        <Autocomplete
          multiple
          freeSolo
          options={filterOptions.campaigns.map((c) => c.name)}
          value={campanhaTags}
          onChange={(_e, newTags) => {
            const tags = newTags as string[];
            setCampanhaTags(tags);
            setDraftFilters((prev) => ({ ...prev, campaignQuery: tags.join("|") }));
          }}
          size="small"
          sx={{ minWidth: 200 }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} size="small" key={index} />
            ))
          }
          renderInput={(inputParams) => <TextField {...inputParams} label="Campanha" />}
        />
        <TextField
          label="Último contato de"
          type="date"
          value={draftFilters.lastContactFrom}
          onChange={(event) => handleFilterChange("lastContactFrom", event.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Último contato até"
          type="date"
          value={draftFilters.lastContactTo}
          onChange={(event) => handleFilterChange("lastContactTo", event.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Agendamento de"
          type="date"
          value={draftFilters.scheduleFrom}
          onChange={(event) => handleFilterChange("scheduleFrom", event.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Agendamento até"
          type="date"
          value={draftFilters.scheduleTo}
          onChange={(event) => handleFilterChange("scheduleTo", event.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Ordenar por"
          select
          value={draftFilters.sortBy}
          onChange={(event) => handleFilterChange("sortBy", event.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="ultimoContato">Último contato</MenuItem>
          <MenuItem value="nome">Nome</MenuItem>
          <MenuItem value="agendamento">Agendamento</MenuItem>
          <MenuItem value="totalContatos">Total de contatos</MenuItem>
          <MenuItem value="operador">Operador</MenuItem>
        </TextField>
        <TextField
          label="Ordem"
          select
          value={draftFilters.sortOrder}
          onChange={(event) => handleFilterChange("sortOrder", event.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="desc">Desc</MenuItem>
          <MenuItem value="asc">Asc</MenuItem>
        </TextField>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) ativos` : "Sem filtros ativos"}
          </span>
          <Button variant="outlined" size="small" startIcon={<FilterAltOffIcon />} onClick={handleResetFilters}>
            Limpar
          </Button>
          <Button variant="contained" size="small" onClick={handleApplyFilters}>
            Aplicar filtros
          </Button>
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
