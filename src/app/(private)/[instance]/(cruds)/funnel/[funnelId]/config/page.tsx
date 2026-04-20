"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "react-toastify";
import { AuthContext } from "@/app/auth-context";
import funnelApiService from "@/lib/services/funnel.service";
import type {
  AgendamentoParams,
  CompraParams,
  ConditionTemplate,
  FunnelStageWithConditions,
  MinContatosParams,
  NoContactParams,
  ResultadoParams,
  StageCondition,
  StageConditionType,
} from "@/lib/types/funnel.types";

// ── Constants ─────────────────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316",
  "#eab308", "#ef4444", "#ec4899", "#14b8a6",
  "#6b7280", "#f43f5e",
];

const CONDITION_TYPE_LABELS: Record<StageConditionType, string> = {
  RESULTADO:    "Resultado",
  AGENDAMENTO:  "Agendamento",
  COMPRA:       "Compra",
  NO_CONTACT:   "Sem contato (dias)",
  MIN_CONTATOS: "Mín. de contatos",
};

const CONDITION_TYPE_INFO: Record<StageConditionType, string> = {
  RESULTADO:
    "Filtra pelo resultado do atendimento registrado no histórico do cliente. " +
    "Você pode avaliar o último resultado, resultados em um período ou no histórico completo. " +
    "Também é possível filtrar por nome do resultado e pelas flags Venda, Contato e Sucesso.",
  AGENDAMENTO:
    "Verifica se o cliente possui (ou não) uma data de agendamento futura registrada. " +
    "Opcionalmente, você pode restringir o intervalo: ex. agendado entre hoje +0 e +7 dias.",
  COMPRA:
    "Analisa o histórico de compras do cliente (excluindo canceladas). " +
    "Filtre por data da última compra, faixa de valor total em um período ou apenas pela existência de compras.",
  NO_CONTACT:
    "O cliente não possui nenhum contato registrado no histórico nos últimos N dias. " +
    "Útil para identificar clientes esquecidos ou inativos.",
  MIN_CONTATOS:
    "O cliente possui ao menos N contatos registrados no histórico nos últimos X dias. " +
    "Útil para identificar clientes com engajamento mínimo recente.",
};

// ── Label helpers ─────────────────────────────────────────────────────────────────────────────
type Resultado = { id: number; nome: string };

function conditionLabel(cond: StageCondition, resultados: Resultado[]): string {
  switch (cond.type) {
    case "RESULTADO": {
      const p = cond.params as ResultadoParams | null;
      if (!p) return "Resultado";
      const scopeLabel =
        p.scope === "last" ? "últ." : p.scope === "period" ? `${p.periodDays ?? "?"}d` : "hist.";
      const flagParts: string[] = [];
      if (p.isVenda === true) flagParts.push("venda");
      if (p.isContato === true) flagParts.push("contato");
      if (p.isSucesso === true) flagParts.push("sucesso");
      const filterPart = p.resultadoFilter?.resultadoIds?.length
        ? (p.resultadoFilter.operator === "not_in" ? "≠ " : "= ") +
          p.resultadoFilter.resultadoIds
            .map((id) => resultados.find((r) => r.id === id)?.nome ?? `#${id}`)
            .slice(0, 2)
            .join(", ") +
          (p.resultadoFilter.resultadoIds.length > 2 ? "..." : "")
        : null;
      const parts = [scopeLabel, filterPart, ...flagParts].filter(Boolean);
      return `Resultado [${parts.join(" | ")}]`;
    }
    case "AGENDAMENTO": {
      const p = cond.params as AgendamentoParams | null;
      if (!p) return "Agendamento";
      if (!p.has) return "Sem agendamento";
      const range =
        p.minDays != null && p.maxDays != null
          ? ` (+${p.minDays}–+${p.maxDays}d)`
          : p.minDays != null
          ? ` (a partir +${p.minDays}d)`
          : p.maxDays != null
          ? ` (até +${p.maxDays}d)`
          : "";
      return `Agendamento futuro${range}`;
    }
    case "COMPRA": {
      const p = cond.params as CompraParams | null;
      if (!p) return "Compra";
      if (p.has === false) return "Sem compra";
      const parts: string[] = [];
      if (p.minLastDate ?? p.maxLastDate) {
        parts.push(`data: ${p.minLastDate ?? "*"} – ${p.maxLastDate ?? "*"}`);
      }
      if (p.minValor != null || p.maxValor != null) {
        parts.push(`R$ ${p.minValor ?? 0}–${p.maxValor ?? "∞"}`);
      }
      return `Compra${parts.length ? ` [${parts.join(", ")}]` : ""}`;
    }
    case "NO_CONTACT": {
      const p = cond.params as NoContactParams | null;
      return `Sem contato há ${p?.days ?? "?"} dias`;
    }
    case "MIN_CONTATOS": {
      const p = cond.params as MinContatosParams | null;
      return `Mín. ${p?.min ?? "?"} contatos / ${p?.days ?? "?"} dias`;
    }
  }
}

function templateLabel(t: ConditionTemplate, resultados: Resultado[]): string {
  return conditionLabel({ id: 0, stageId: 0, type: t.type, params: t.params }, resultados);
}

// ── Tri-state toggle (Qualquer / Sim / Não) ─────────────────────────────────────────────────────
type TriState = null | true | false;
function TriStateToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value === null ? "any" : value ? "yes" : "no"}
        onChange={(_, v) => {
          if (v === null) return;
          onChange(v === "any" ? null : v === "yes" ? true : false);
        }}
      >
        <ToggleButton value="any" sx={{ fontSize: "10px", px: 1, py: 0.3 }}>Qualquer</ToggleButton>
        <ToggleButton value="yes" sx={{ fontSize: "10px", px: 1, py: 0.3 }}>Sim</ToggleButton>
        <ToggleButton value="no"  sx={{ fontSize: "10px", px: 1, py: 0.3 }}>Não</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

// ── Sub-forms per condition type ────────────────────────────────────────────────────────────────────
function ResultadoForm({
  resultados,
  value,
  onChange,
}: {
  resultados: Resultado[];
  value: ResultadoParams;
  onChange: (v: ResultadoParams) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = resultados.filter((r) =>
    r.nome.toLowerCase().includes(search.toLowerCase()),
  );
  const toggleResultado = (id: number) => {
    const current = value.resultadoFilter ?? { operator: "in" as const, resultadoIds: [] };
    const ids = current.resultadoIds.includes(id)
      ? current.resultadoIds.filter((x) => x !== id)
      : [...current.resultadoIds, id];
    onChange({ ...value, resultadoFilter: { ...current, resultadoIds: ids } });
  };
  const clearFilter = () => onChange({ ...value, resultadoFilter: undefined });

  return (
    <div className="flex flex-col gap-3">
      {/* Scope */}
      <FormControl size="small">
        <div className="flex items-center gap-1 mb-0.5">
          <FormLabel sx={{ fontSize: "12px" }}>Escopo</FormLabel>
          <Tooltip
            title="Último: avalia só o resultado mais recente. Período: qualquer resultado nos últimos N dias. Histórico completo: qualquer resultado já registrado."
            arrow
          >
            <InfoOutlinedIcon sx={{ fontSize: 13, color: "text.disabled", cursor: "help" }} />
          </Tooltip>
        </div>
        <RadioGroup
          row
          value={value.scope}
          onChange={(e) =>
            onChange({
              ...value,
              scope: e.target.value as ResultadoParams["scope"],
              periodDays: undefined,
            })
          }
        >
          <FormControlLabel
            value="last"
            control={<Radio size="small" />}
            label={<span className="text-sm">Últ. resultado</span>}
          />
          <FormControlLabel
            value="period"
            control={<Radio size="small" />}
            label={<span className="text-sm">Período</span>}
          />
          <FormControlLabel
            value="all_time"
            control={<Radio size="small" />}
            label={<span className="text-sm">Histórico completo</span>}
          />
        </RadioGroup>
      </FormControl>

      {value.scope === "period" && (
        <TextField
          size="small"
          type="number"
          label="Considerar últimos (dias)"
          value={value.periodDays ?? 30}
          onChange={(e) =>
            onChange({ ...value, periodDays: Math.max(1, parseInt(e.target.value, 10) || 30) })
          }
          inputProps={{ min: 1 }}
        />
      )}

      {/* Resultado filter */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Filtrar por resultado (opcional)
          </span>
          {(value.resultadoFilter?.resultadoIds?.length ?? 0) > 0 && (
            <button onClick={clearFilter} className="text-[10px] text-red-400 hover:underline">
              Limpar
            </button>
          )}
        </div>
        {(value.resultadoFilter?.resultadoIds?.length ?? 0) > 0 && (
          <FormControl size="small" fullWidth>
            <InputLabel>Operador</InputLabel>
            <Select
              label="Operador"
              value={value.resultadoFilter?.operator ?? "in"}
              onChange={(e) =>
                onChange({
                  ...value,
                  resultadoFilter: {
                    operator: e.target.value as "in" | "not_in",
                    resultadoIds: value.resultadoFilter?.resultadoIds ?? [],
                  },
                })
              }
            >
              <MenuItem value="in">Igual a (um dos selecionados)</MenuItem>
              <MenuItem value="not_in">Diferente de (nenhum dos selecionados)</MenuItem>
            </Select>
          </FormControl>
        )}
        <TextField
          size="small"
          placeholder="Buscar resultado…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 15 }} />
              </InputAdornment>
            ),
          }}
        />
        <div className="flex max-h-40 flex-col overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
          {filtered.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">Nenhum resultado.</p>
          ) : (
            <FormGroup>
              {filtered.map((r) => (
                <FormControlLabel
                  key={r.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={value.resultadoFilter?.resultadoIds?.includes(r.id) ?? false}
                      onChange={() => toggleResultado(r.id)}
                      sx={{ py: 0.5 }}
                    />
                  }
                  label={<span className="text-sm">{r.nome}</span>}
                  sx={{ mx: 0, px: 1 }}
                />
              ))}
            </FormGroup>
          )}
        </div>
        {(value.resultadoFilter?.resultadoIds?.length ?? 0) > 0 && (
          <p className="text-xs text-slate-400">
            {value.resultadoFilter!.resultadoIds.length} selecionado(s)
          </p>
        )}
      </div>

      {/* Flags */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Flags do resultado (opcional)
        </span>
        <div className="flex flex-wrap gap-3">
          <TriStateToggle
            label="Venda"
            value={value.isVenda ?? null}
            onChange={(v) => onChange({ ...value, isVenda: v ?? undefined })}
          />
          <TriStateToggle
            label="Contato"
            value={value.isContato ?? null}
            onChange={(v) => onChange({ ...value, isContato: v ?? undefined })}
          />
          <TriStateToggle
            label="Sucesso"
            value={value.isSucesso ?? null}
            onChange={(v) => onChange({ ...value, isSucesso: v ?? undefined })}
          />
        </div>
      </div>
    </div>
  );
}

function AgendamentoForm({
  value,
  onChange,
}: {
  value: AgendamentoParams;
  onChange: (v: AgendamentoParams) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormControl size="small">
        <div className="flex items-center gap-1 mb-0.5">
          <FormLabel sx={{ fontSize: "12px" }}>Tipo</FormLabel>
          <Tooltip
            title="Agendamento futuro = DT_AGENDAMENTO ≥ hoje. Use min/máx para restringir o intervalo de dias a partir de hoje."
            arrow
          >
            <InfoOutlinedIcon sx={{ fontSize: 13, color: "text.disabled", cursor: "help" }} />
          </Tooltip>
        </div>
        <RadioGroup
          row
          value={value.has ? "yes" : "no"}
          onChange={(e) =>
            onChange({ has: e.target.value === "yes", minDays: undefined, maxDays: undefined })
          }
        >
          <FormControlLabel
            value="yes"
            control={<Radio size="small" />}
            label={<span className="text-sm">Possui agendamento futuro</span>}
          />
          <FormControlLabel
            value="no"
            control={<Radio size="small" />}
            label={<span className="text-sm">Sem agendamento futuro</span>}
          />
        </RadioGroup>
      </FormControl>

      {value.has && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">
            Intervalo (dias a partir de hoje — opcional)
          </span>
          <div className="flex gap-2">
            <TextField
              size="small"
              type="number"
              label="Mínimo (+dias)"
              value={value.minDays ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  minDays:
                    e.target.value === ""
                      ? undefined
                      : Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              inputProps={{ min: 0 }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              type="number"
              label="Máximo (+dias)"
              value={value.maxDays ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  maxDays:
                    e.target.value === ""
                      ? undefined
                      : Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              inputProps={{ min: 0 }}
              sx={{ flex: 1 }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Hoje + {value.minDays ?? 0} até hoje + {value.maxDays ?? "∞"} dias.
          </p>
        </div>
      )}
    </div>
  );
}

function CompraForm({
  value,
  onChange,
}: {
  value: CompraParams;
  onChange: (v: CompraParams) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel>Possui compra?</InputLabel>
          <Select
            label="Possui compra?"
            value={value.has === true ? "yes" : value.has === false ? "no" : "any"}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...value,
                has: v === "any" ? undefined : v === "yes" ? true : false,
              });
            }}
          >
            <MenuItem value="any">Indiferente</MenuItem>
            <MenuItem value="yes">Sim — possui compra</MenuItem>
            <MenuItem value="no">Não — sem compra</MenuItem>
          </Select>
        </FormControl>
        <Tooltip
          title="Considera compras não canceladas. Indiferente = ignora este critério; Não = cliente sem nenhuma compra."
          arrow
          placement="right"
        >
          <InfoOutlinedIcon
            sx={{ fontSize: 18, color: "text.disabled", cursor: "help", flexShrink: 0 }}
          />
        </Tooltip>
      </div>

      {value.has !== false && (
        <>
          <div className="flex gap-2">
            <TextField
              size="small"
              type="date"
              label="Data mín. da última compra"
              value={value.minLastDate ?? ""}
              onChange={(e) => onChange({ ...value, minLastDate: e.target.value || null })}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              type="date"
              label="Data máx. da última compra"
              value={value.maxLastDate ?? ""}
              onChange={(e) => onChange({ ...value, maxLastDate: e.target.value || null })}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </div>
          <div className="flex gap-2">
            <TextField
              size="small"
              type="number"
              label="Valor mínimo (R$)"
              value={value.minValor ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  minValor: e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              type="number"
              label="Valor máximo (R$)"
              value={value.maxValor ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  maxValor: e.target.value === "" ? null : parseFloat(e.target.value),
                })
              }
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ flex: 1 }}
            />
          </div>
          {(value.minValor != null || value.maxValor != null) && (
            <TextField
              size="small"
              type="number"
              label="Período para soma do valor (dias — vazio = histórico)"
              value={value.valorPeriodDays ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  valorPeriodDays:
                    e.target.value === ""
                      ? null
                      : Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              inputProps={{ min: 1 }}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Save-as-template dialog ────────────────────────────────────────────────────────────────────────────
interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}
function SaveAsTemplateDialog({ open, onClose, onConfirm }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const handleConfirm = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onConfirm(name.trim());
      setName("");
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Salvar como template</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          label="Nome do template"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          fullWidth
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleConfirm}
          disabled={saving || !name.trim()}
        >
          {saving ? <CircularProgress size={15} color="inherit" /> : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add-condition form ────────────────────────────────────────────────────────────────────────────────
interface AddConditionFormProps {
  resultados: Resultado[];
  stageId: number;
  funnelId: number;
  token: string;
  onSave: (type: StageConditionType, params?: Record<string, unknown>) => Promise<StageCondition>;
  onCancel: () => void;
  onTemplateSaved: (t: ConditionTemplate) => void;
}
const DEFAULT_RESULTADO: ResultadoParams = { scope: "last" };
const DEFAULT_AGENDAMENTO: AgendamentoParams = { has: true };
const DEFAULT_COMPRA: CompraParams = {};

function AddConditionForm({
  resultados,
  stageId,
  funnelId,
  token,
  onSave,
  onCancel,
  onTemplateSaved,
}: AddConditionFormProps) {
  const [type, setType] = useState<StageConditionType>("RESULTADO");
  const [resultado, setResultado] = useState<ResultadoParams>(DEFAULT_RESULTADO);
  const [agendamento, setAgendamento] = useState<AgendamentoParams>(DEFAULT_AGENDAMENTO);
  const [compra, setCompra] = useState<CompraParams>(DEFAULT_COMPRA);
  const [noContactDays, setNoContactDays] = useState(30);
  const [minContatosMin, setMinContatosMin] = useState(1);
  const [minContatosDays, setMinContatosDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [savedConditionId, setSavedConditionId] = useState<number | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const buildParams = (): Record<string, unknown> | undefined => {
    switch (type) {
      case "RESULTADO":    return resultado as unknown as Record<string, unknown>;
      case "AGENDAMENTO":  return agendamento as unknown as Record<string, unknown>;
      case "COMPRA":       return compra as unknown as Record<string, unknown>;
      case "NO_CONTACT":   return { days: noContactDays };
      case "MIN_CONTATOS": return { min: minContatosMin, days: minContatosDays };
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const created = await onSave(type, buildParams());
      setSavedConditionId(created.id);
      toast.success("Condição adicionada.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao adicionar condição.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (name: string) => {
    if (!savedConditionId) return;
    const t = await funnelApiService.saveConditionAsTemplate(
      token, funnelId, stageId, savedConditionId, name,
    );
    onTemplateSaved(t);
    toast.success(`Template "${name}" salvo.`);
  };

  const resetForm = () => {
    setSavedConditionId(null);
    setResultado(DEFAULT_RESULTADO);
    setAgendamento(DEFAULT_AGENDAMENTO);
    setCompra(DEFAULT_COMPRA);
    setNoContactDays(30);
    setMinContatosMin(1);
    setMinContatosDays(30);
  };

  const handleAddAnother = () => { resetForm(); };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/60">
      {savedConditionId ? (
        /* Post-save actions */
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-green-600 dark:text-green-400">✓ Condição adicionada.</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="small"
              variant="outlined"
              startIcon={<BookmarkBorderIcon sx={{ fontSize: 14 }} />}
              onClick={() => setTemplateDialogOpen(true)}
            >
              Salvar como template
            </Button>
            <Button size="small" onClick={handleAddAnother}>+ Outra condição</Button>
            <Button size="small" onClick={onCancel}>Fechar</Button>
          </div>
          <SaveAsTemplateDialog
            open={templateDialogOpen}
            onClose={() => setTemplateDialogOpen(false)}
            onConfirm={handleSaveTemplate}
          />
        </div>
      ) : (
        <>
          {/* Type selector with info icon */}
          <div className="flex items-center gap-2">
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Tipo de condição</InputLabel>
              <Select
                label="Tipo de condição"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as StageConditionType);
                  resetForm();
                }}
              >
                {(Object.keys(CONDITION_TYPE_LABELS) as StageConditionType[]).map((t) => (
                  <MenuItem key={t} value={t}>{CONDITION_TYPE_LABELS[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title={CONDITION_TYPE_INFO[type]} arrow placement="right">
              <InfoOutlinedIcon
                sx={{ fontSize: 18, color: "text.disabled", cursor: "help", flexShrink: 0 }}
              />
            </Tooltip>
          </div>

          {/* Type-specific form */}
          {type === "RESULTADO" && (
            <ResultadoForm resultados={resultados} value={resultado} onChange={setResultado} />
          )}
          {type === "AGENDAMENTO" && (
            <AgendamentoForm value={agendamento} onChange={setAgendamento} />
          )}
          {type === "COMPRA" && (
            <CompraForm value={compra} onChange={setCompra} />
          )}
          {type === "NO_CONTACT" && (
            <div className="flex items-start gap-2">
              <TextField
                size="small"
                type="number"
                label="Sem contato há quantos dias?"
                value={noContactDays}
                onChange={(e) =>
                  setNoContactDays(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />
              <Tooltip
                title="Nenhum registro no histórico nos últimos N dias. Ex.: 30 = cliente sem atendimento há mais de 30 dias."
                arrow
                placement="right"
              >
                <InfoOutlinedIcon
                  sx={{ fontSize: 18, color: "text.disabled", cursor: "help", mt: "10px", flexShrink: 0 }}
                />
              </Tooltip>
            </div>
          )}
          {type === "MIN_CONTATOS" && (
            <div className="flex items-start gap-2">
              <div className="flex gap-2 flex-1">
                <TextField
                  size="small"
                  type="number"
                  label="Mínimo de contatos"
                  value={minContatosMin}
                  onChange={(e) =>
                    setMinContatosMin(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  inputProps={{ min: 1 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Nos últimos (dias)"
                  value={minContatosDays}
                  onChange={(e) =>
                    setMinContatosDays(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  inputProps={{ min: 1 }}
                  sx={{ flex: 1 }}
                />
              </div>
              <Tooltip
                title="O cliente deve ter pelo menos N eventos no histórico nos últimos X dias."
                arrow
                placement="right"
              >
                <InfoOutlinedIcon
                  sx={{ fontSize: 18, color: "text.disabled", cursor: "help", mt: "10px", flexShrink: 0 }}
                />
              </Tooltip>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={15} color="inherit" /> : "Adicionar"}
            </Button>
            <Button size="small" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Template library ────────────────────────────────────────────────────────────────────────────────
interface TemplateLibraryProps {
  templates: ConditionTemplate[];
  resultados: Resultado[];
  stages: FunnelStageWithConditions[];
  token: string;
  funnelId: number;
  onConditionAdded: (stageId: number, cond: StageCondition) => void;
  onTemplateDeleted: (id: number) => void;
}
function TemplateLibrary({
  templates,
  resultados,
  stages,
  token,
  funnelId,
  onConditionAdded,
  onTemplateDeleted,
}: TemplateLibraryProps) {
  const [expanded, setExpanded] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [stageSelectFor, setStageSelectFor] = useState<ConditionTemplate | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | "">("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleApplyTemplate = async () => {
    if (!stageSelectFor || !selectedStageId) return;
    setApplyingId(stageSelectFor.id);
    try {
      const created = await funnelApiService.addCondition(
        token,
        funnelId,
        selectedStageId as number,
        stageSelectFor.type,
        stageSelectFor.params as Record<string, unknown> | undefined,
      );
      onConditionAdded(selectedStageId as number, created as StageCondition);
      toast.success(`Template "${stageSelectFor.name}" aplicado.`);
      setStageSelectFor(null);
      setSelectedStageId("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao aplicar template.";
      toast.error(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await funnelApiService.deleteTemplate(token, id);
      onTemplateDeleted(id);
      toast.success("Template removido.");
    } catch {
      toast.error("Erro ao remover template.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          Templates de condição ({templates.length})
        </Typography>
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "none",
            color: "text.secondary",
          }}
        />
      </button>
      <Collapse in={expanded}>
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          {templates.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nenhum template salvo. Adicione uma condição e clique em &quot;Salvar como template&quot;.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <Tooltip key={t.id} title={templateLabel(t, resultados)} arrow>
                  <Chip
                    label={t.name}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setStageSelectFor(t);
                      setSelectedStageId("");
                    }}
                    onDelete={deleting === t.id ? undefined : () => handleDelete(t.id)}
                    deleteIcon={deleting === t.id ? <CircularProgress size={11} /> : undefined}
                    sx={{ cursor: "pointer", fontSize: "11px" }}
                  />
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </Collapse>

      {/* Stage-picker dialog */}
      <Dialog
        open={!!stageSelectFor}
        onClose={() => setStageSelectFor(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Aplicar template: {stageSelectFor?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {stageSelectFor && templateLabel(stageSelectFor, resultados)}
          </Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Estágio destino</InputLabel>
            <Select
              label="Estágio destino"
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value as number)}
            >
              {stages.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setStageSelectFor(null)}>
            Cancelar
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApplyTemplate}
            disabled={!selectedStageId || applyingId !== null}
          >
            {applyingId !== null ? <CircularProgress size={15} color="inherit" /> : "Aplicar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────────────────────────────────
export default function FunnelConfigPage() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const params = useParams<{ instance: string; funnelId: string }>();
  const funnelId = parseInt(params.funnelId, 10);

  const [funnelName, setFunnelName] = useState("");
  const [funnelType, setFunnelType] = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");
  const [stages, setStages] = useState<FunnelStageWithConditions[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [templates, setTemplates] = useState<ConditionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // New stage form
  const [stageName, setStageName] = useState("");
  const [stageColor, setStageColor] = useState(PRESET_COLORS[0] ?? "#3b82f6");
  const [addingStage, setAddingStage] = useState(false);
  const [showStageForm, setShowStageForm] = useState(false);
  const [deletingStageId, setDeletingStageId] = useState<number | null>(null);

  // Condition management
  const [addConditionForStage, setAddConditionForStage] = useState<number | null>(null);
  const [deletingConditionId, setDeletingConditionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { funnel, resultados: res, templates: tpls } = await funnelApiService.getConfig(
        token,
        funnelId,
      );
      setFunnelName(funnel.name);
      setFunnelType(funnel.type);
      setStages(funnel.stages as FunnelStageWithConditions[]);
      setResultados(res);
      setTemplates(tpls);
    } catch {
      toast.error("Não foi possível carregar a configuração.");
    } finally {
      setLoading(false);
    }
  }, [token, funnelId]);

  useEffect(() => { load(); }, [load]);

  const handleAddStage = async () => {
    if (!token || !stageName.trim()) return;
    setAddingStage(true);
    try {
      const created = await funnelApiService.createStage(
        token, funnelId, stageName.trim(), stageColor,
      );
      setStages((prev) => [...prev, { ...created, conditions: [] }]);
      setStageName("");
      setStageColor(PRESET_COLORS[0] ?? "#3b82f6");
      setShowStageForm(false);
      toast.success(`Estágio "${created.name}" criado.`);
    } catch {
      toast.error("Erro ao criar estágio.");
    } finally {
      setAddingStage(false);
    }
  };

  const handleDeleteStage = async (stageId: number, name: string) => {
    setDeletingStageId(stageId);
    try {
      await funnelApiService.deleteStage(token!, funnelId, stageId);
      setStages((prev) => prev.filter((s) => s.id !== stageId));
      toast.success(`Estágio "${name}" excluído.`);
    } catch {
      toast.error("Erro ao excluir estágio.");
    } finally {
      setDeletingStageId(null);
    }
  };

  const handleAddCondition = async (
    stageId: number,
    type: StageConditionType,
    params?: Record<string, unknown>,
  ): Promise<StageCondition> => {
    if (!token) throw new Error("Unauthenticated");
    try {
      const created = await funnelApiService.addCondition(token, funnelId, stageId, type, params);
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId ? { ...s, conditions: [...s.conditions, created as StageCondition] } : s,
        ),
      );
      return created as StageCondition;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao adicionar condição.";
      toast.error(msg);
      throw err;
    }
  };

  const handleRemoveCondition = async (stageId: number, conditionId: number) => {
    setDeletingConditionId(conditionId);
    try {
      await funnelApiService.removeCondition(token!, funnelId, stageId, conditionId);
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? { ...s, conditions: s.conditions.filter((c) => c.id !== conditionId) }
            : s,
        ),
      );
    } catch {
      toast.error("Erro ao remover condição.");
    } finally {
      setDeletingConditionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <IconButton size="small" onClick={() => router.back()}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Configurar: {funnelName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Defina os estágios e as condições de classificação dos clientes.
          </p>
        </div>
      </div>

      {/* ── Stages section ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Estágios
          </h2>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setShowStageForm((v) => !v)}>
            Novo estágio
          </Button>
        </div>

        {showStageForm && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <TextField
              size="small"
              label="Nome do estágio"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              sx={{ minWidth: 180 }}
            />
            <div className="flex items-center gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => setStageColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    stageColor === c
                      ? "scale-125 ring-2 ring-offset-1 ring-white dark:ring-offset-slate-800"
                      : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
            <Button
              variant="contained"
              size="small"
              onClick={handleAddStage}
              disabled={addingStage || !stageName.trim()}
            >
              {addingStage ? <CircularProgress size={16} color="inherit" /> : "Criar"}
            </Button>
            <Button size="small" onClick={() => setShowStageForm(false)} disabled={addingStage}>
              Cancelar
            </Button>
          </div>
        )}

        {stages.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum estágio criado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stages.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium"
                style={{ borderColor: s.color, backgroundColor: s.color + "18", color: s.color }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: s.color,
                  }}
                />
                {s.name}
                <Tooltip title="Excluir estágio">
                  <span>
                    <IconButton
                      sx={{ color: s.color, padding: "2px" }}
                      onClick={() => handleDeleteStage(s.id, s.name)}
                      disabled={deletingStageId === s.id}
                    >
                      {deletingStageId === s.id ? (
                        <CircularProgress size={12} />
                      ) : (
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Conditions per stage ───────────────────────────────────────────────────────────────────── */}
      {funnelType !== "MANUAL" && stages.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Condições por estágio
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Um cliente entra no estágio quando{" "}
              <strong>todas</strong> as condições são atendidas.
            </p>
          </div>
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {stage.name}
                </span>
                {stage.conditions.length === 0 && (
                  <span className="text-xs text-amber-500">
                    (sem condições — não aparece no board)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {stage.conditions.map((cond) => (
                  <Chip
                    key={cond.id}
                    label={conditionLabel(cond, resultados)}
                    size="small"
                    variant="outlined"
                    onDelete={
                      deletingConditionId === cond.id
                        ? undefined
                        : () => handleRemoveCondition(stage.id, cond.id)
                    }
                    deleteIcon={
                      deletingConditionId === cond.id ? (
                        <CircularProgress size={12} />
                      ) : (
                        <CloseIcon />
                      )
                    }
                    sx={{
                      borderColor: stage.color,
                      color: stage.color,
                      backgroundColor: stage.color + "14",
                      "& .MuiChip-deleteIcon": { color: stage.color },
                    }}
                  />
                ))}
                {addConditionForStage === stage.id ? (
                  <div className="mt-1 w-full">
                    <AddConditionForm
                      resultados={resultados}
                      stageId={stage.id}
                      funnelId={funnelId}
                      token={token!}
                      onSave={(type, params) => handleAddCondition(stage.id, type, params)}
                      onCancel={() => setAddConditionForStage(null)}
                      onTemplateSaved={(t) => setTemplates((prev) => [...prev, t])}
                    />
                  </div>
                ) : (
                  <Chip
                    label="+ Adicionar condição"
                    size="small"
                    variant="outlined"
                    onClick={() => setAddConditionForStage(stage.id)}
                    sx={{ cursor: "pointer", borderStyle: "dashed" }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Template library ───────────────────────────────────────────────────────────────────────────── */}
      {funnelType !== "MANUAL" && (
      <TemplateLibrary
        templates={templates}
        resultados={resultados}
        stages={stages}
        token={token!}
        funnelId={funnelId}
        onConditionAdded={(stageId, cond) =>
          setStages((prev) =>
            prev.map((s) =>
              s.id === stageId ? { ...s, conditions: [...s.conditions, cond] } : s,
            ),
          )
        }
        onTemplateDeleted={(id) => setTemplates((prev) => prev.filter((t) => t.id !== id))}
      />
      )}
    </div>
  );
}
