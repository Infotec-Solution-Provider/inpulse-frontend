"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import PanToolAltIcon from "@mui/icons-material/PanToolAlt";
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
    columns,
    filters,
    loading,
    hasSnapshot,
    snapshotStatus,
    lastComputedAt,
    triggerRefresh,
    applyFilters,
    resetFilters,
  } = useFunnelContext();
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    funnelApiService
      .getFunnelFilterOptions(token, funnelId)
      .then((data) => setFilterOptions(data))
      .catch(() => {
        /* silently ignore — fields remain empty */
      });
  }, [token, params.funnelId]);

  const isProcessing = snapshotStatus === "processing";
  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        if (key === "sortBy") return value !== "ultimoContato";
        if (key === "sortOrder") return value !== "desc";
        return value !== "";
      }).length,
    [filters],
  );
  const totalCustomers = useMemo(
    () => columns.reduce((total, column) => total + column.total, 0),
    [columns],
  );

  const handleFilterChange = (field: keyof FunnelBoardFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = async () => {
    await applyFilters(draftFilters);
  };

  const handleResetFilters = async () => {
    await resetFilters();
    setFiltersOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-slate-100/70 dark:bg-slate-950/40">
      {/* Processing progress bar */}
      {isProcessing && (
        <LinearProgress
          sx={{ height: 3, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}
        />
      )}

      {/* Header */}
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <IconButton
            size="small"
            aria-label="Voltar para pipelines"
            onClick={() => router.push(`/${params.instance}/funnel`)}
            sx={{ border: 1, borderColor: "divider" }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {funnelName || "Pipeline"}
              </h1>
              <span
                className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex ${isManual ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}
              >
                {isManual ? (
                  <PanToolAltIcon sx={{ fontSize: 12 }} />
                ) : (
                  <AutorenewIcon sx={{ fontSize: 12 }} />
                )}
                {isManual ? "Manual" : "Automático"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isManual
                ? "Pipeline manual — adicione e mova clientes arrastando entre etapas."
                : isProcessing
                  ? "Gerando snapshot… isso pode levar alguns minutos."
                  : lastComputedAt
                    ? `Atualizado ${new Date(lastComputedAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Nenhum snapshot gerado ainda."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!loading && (
            <span className="mr-1 hidden text-xs text-slate-500 dark:text-slate-400 lg:inline">
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                {totalCustomers.toLocaleString("pt-BR")}
              </strong>{" "}
              {totalCustomers === 1 ? "cliente" : "clientes"}
            </span>
          )}
          <Button
            variant={filtersOpen || activeFiltersCount > 0 ? "contained" : "outlined"}
            color={filtersOpen || activeFiltersCount > 0 ? "primary" : "inherit"}
            size="small"
            startIcon={<FilterListIcon />}
            endIcon={filtersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </Button>
          <Tooltip title="Configurar estágios e condições">
            <IconButton
              size="small"
              aria-label="Configurar pipeline"
              onClick={() => router.push(`/${params.instance}/funnel/${params.funnelId}/config`)}
              sx={{ border: 1, borderColor: "divider" }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!isManual && (
            <Button
              variant="contained"
              size="small"
              startIcon={
                isProcessing ? <CircularProgress size={14} color="inherit" /> : <AutorenewIcon />
              }
              disabled={isProcessing || loading}
              onClick={triggerRefresh}
            >
              {isProcessing ? "Processando…" : "Atualizar"}
            </Button>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="grid shrink-0 grid-cols-1 gap-3 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
            getOptionLabel={(option) => (option === "__NULL__" ? "Sem Grupo" : option)}
            size="small"
            fullWidth
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option === "__NULL__" ? "Sem Grupo" : option}
                  {...getTagProps({ index })}
                  size="small"
                  key={index}
                />
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
            getOptionLabel={(option) => (option === "__NULL__" ? "Sem Segmento" : option)}
            size="small"
            fullWidth
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option === "__NULL__" ? "Sem Segmento" : option}
                  {...getTagProps({ index })}
                  size="small"
                  key={index}
                />
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
            getOptionLabel={(option) => (option === "__NULL__" ? "Sem Operador" : option)}
            size="small"
            fullWidth
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option === "__NULL__" ? "Sem Operador" : option}
                  {...getTagProps({ index })}
                  size="small"
                  key={index}
                />
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
            fullWidth
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
            fullWidth
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
            fullWidth
          >
            <MenuItem value="desc">Desc</MenuItem>
            <MenuItem value="asc">Asc</MenuItem>
          </TextField>
          <div className="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-6">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeFiltersCount > 0
                ? `${activeFiltersCount} filtro(s) ativos`
                : "Sem filtros ativos"}
            </span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterAltOffIcon />}
              onClick={handleResetFilters}
            >
              Limpar
            </Button>
            <Button variant="contained" size="small" onClick={handleApplyFilters}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Processing banner (automatic only) */}
      {!isManual && isProcessing && (
        <div className="flex shrink-0 items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
          <CircularProgress size={14} color="inherit" />
          <span>
            Classificando clientes nos estágios... o board será atualizado automaticamente.
          </span>
        </div>
      )}

      {/* Board or empty state */}
      {!isManual && !hasSnapshot && !loading ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
              <AutorenewIcon sx={{ fontSize: 26 }} />
            </div>
            <div>
              <p className="font-medium">Nenhum dado disponível.</p>
              <p className="text-sm">
                Clique em &quot;Atualizar&quot; para gerar o primeiro snapshot.
              </p>
            </div>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutorenewIcon />}
              onClick={triggerRefresh}
            >
              Gerar agora
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-3 sm:px-4">
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
