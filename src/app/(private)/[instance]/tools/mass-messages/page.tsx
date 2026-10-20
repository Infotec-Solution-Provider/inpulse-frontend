"use client";
import { CrmPage, CrmFilters, CrmTableHead, useCrmQueryState } from "@/lib/ui-system";
import { crmError } from "@/lib/crm-marketing-form";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";

import { useAuthContext } from "@/app/auth-context";
import marketingService, {
  CampaignDispatchRow,
  MarketingCampaign,
  MonitoringSummary,
} from "@/lib/services/marketing.service";
import { AttachFile, Cancel, EmojiEmotions, Send, Visibility } from "@/lib/ui-system/crm-icons";
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Popover,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import dayjs from "dayjs";
import EmojiPicker from "emoji-picker-react";
import { startTransition, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import MassAudienceSelector from "@/lib/components/mass-audience-selector";
import MassAudienceClient, {
  type AudienceCreationSummary,
} from "@/lib/services/mass-audience.client";
import { emptyMassAudienceValue } from "@/lib/mass-audience";
import { WhatsappContext } from "../../whatsapp-context";

type DraftForm = {
  name: string;
  description: string;
  messageBody: string;
  senderClientId: string;
  contentMode: "text" | "template";
  templateName: string;
  scheduleMode: "ONE_TIME" | "RECURRING";
  startDate: string;
  weekdays: string[];
  frequencyDays: string;
  dayPeriodStart: string;
  dayPeriodEnd: string;
};

type ListFilters = {
  campaignId: string;
  status: string;
  senderClientId: string;
  sendMode: string;
  page: number;
  perPage: number;
};

type RowSummary = MonitoringSummary & {
  dispatchesLabel: string;
};

type TemplateVariableMap = Record<string, string>;

const statusOptions = [
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "DRAFT" },
  { label: "Pronto", value: "READY" },
  { label: "Agendado", value: "SCHEDULED" },
  { label: "Executando", value: "RUNNING" },
  { label: "Pausado", value: "PAUSED" },
  { label: "Concluido", value: "COMPLETED" },
  { label: "Falhou", value: "FAILED" },
  { label: "Cancelado", value: "CANCELLED" },
];

const sendModeOptions = [
  { label: "Todos", value: "" },
  { label: "Imediato", value: "IMMEDIATE" },
  { label: "Uma vez", value: "ONE_TIME" },
  { label: "Recorrente", value: "RECURRING" },
];

const creationModeOptions = [
  { label: "Único", value: "ONE_TIME" },
  { label: "Recorrente", value: "RECURRING" },
];

const weekdayOptions = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sab" },
  { value: "0", label: "Dom" },
];

const statusLabelMap: Record<string, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto",
  SCHEDULED: "Agendado",
  RUNNING: "Executando",
  PAUSED: "Pausado",
  COMPLETED: "Concluido",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
  PENDING: "Pendente",
  PROCESSING: "Processando",
  SENT: "Enviada",
  DELIVERED: "Entregue",
  READ: "Lida",
  OPTED_OUT: "Opt-out",
};

const statusColor = (status: string) => {
  const byStatus: Record<
    string,
    "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning"
  > = {
    DRAFT: "default",
    READY: "info",
    SCHEDULED: "secondary",
    RUNNING: "warning",
    PAUSED: "default",
    COMPLETED: "success",
    FAILED: "error",
    CANCELLED: "error",
    PENDING: "default",
    PROCESSING: "primary",
    SENT: "info",
    DELIVERED: "success",
    READ: "success",
    OPTED_OUT: "warning",
  };

  return byStatus[status] || "default";
};

function formatPeriod(campaign: MarketingCampaign) {
  const startAt = campaign.scheduleRule?.startAt;
  const endAt = campaign.scheduleRule?.endAt;
  const sendMode = campaign.scheduleRule?.sendMode;
  const range = Array.isArray(campaign.scheduleRule?.timeRangesJson)
    ? (campaign.scheduleRule?.timeRangesJson[0] as { start?: string; end?: string } | undefined)
    : undefined;
  const rangeStart = typeof range?.start === "string" ? range.start : undefined;
  const rangeEnd = typeof range?.end === "string" ? range.end : undefined;

  if (!startAt && sendMode === "IMMEDIATE") {
    return "Imediato";
  }

  if (rangeStart && rangeEnd) {
    return `${rangeStart} - ${rangeEnd}`;
  }

  if (startAt && endAt) {
    return `${dayjs(startAt).format("DD/MM HH:mm")} - ${dayjs(endAt).format("DD/MM HH:mm")}`;
  }

  if (startAt) {
    return `${sendMode === "RECURRING" ? "Recorrente desde" : "A partir de"} ${dayjs(startAt).format("DD/MM HH:mm")}`;
  }

  return "Nao definido";
}

function formatRecurrence(campaign: MarketingCampaign) {
  if (!campaign.scheduleRule) return "-";

  const sendMode = campaign.scheduleRule.sendMode;
  if (sendMode === "ONE_TIME") {
    return "Único";
  }

  if (sendMode !== "RECURRING") {
    return "-";
  }

  const weekdays = Array.isArray(campaign.scheduleRule.allowedWeekdaysJson)
    ? campaign.scheduleRule.allowedWeekdaysJson
    : [];
  const labels = weekdays
    .map((day) => weekdayOptions.find((option) => option.value === String(day))?.label)
    .filter(Boolean)
    .join(", ");

  const range = Array.isArray(campaign.scheduleRule.timeRangesJson)
    ? (campaign.scheduleRule.timeRangesJson[0] as { frequencyDays?: number } | undefined)
    : undefined;
  const frequencyDays = typeof range?.frequencyDays === "number" ? range.frequencyDays : null;

  return `${frequencyDays ? `A cada ${frequencyDays} dia(s)` : "Recorrente"}${labels ? ` • ${labels}` : ""}`;
}

function buildDispatchesLabel(summary: MonitoringSummary) {
  return `${summary.dispatches.DELIVERED + summary.dispatches.READ + summary.dispatches.SENT} enviadas • ${summary.dispatches.PENDING + summary.dispatches.PROCESSING} pendentes • ${summary.dispatches.FAILED} falhas`;
}

function getStatusLabel(status: string) {
  return statusLabelMap[status] || status;
}

function buildTemplatePreview(
  template: { source: string; text: string; raw: unknown } | null | undefined,
  templateVariables: TemplateVariableMap,
) {
  if (!template) {
    return "";
  }

  if (template.source === "waba" && template.text) {
    const bodyComponent =
      typeof template.raw === "object" && template.raw !== null && "components" in template.raw
        ? (
            template.raw as {
              components?: Array<{ type?: string; example?: { body_text?: string[][] } }>;
            }
          ).components?.find((component) => component.type === "BODY")
        : undefined;
    const exampleValues = bodyComponent?.example?.body_text?.[0];

    return template.text.replace(/{{(\d+)}}/g, (_match, group: string) => {
      const index = Number(group) - 1;
      const exampleKey = exampleValues?.[index];
      return (exampleKey && templateVariables[exampleKey]) || exampleKey || `{{${group}}}`;
    });
  }

  return template.text || "";
}

export default function MassMessagesPage() {
  const { instance, user } = useAuthContext();
  return <MassMessagesScreen key={`${instance}:${user?.CODIGO ?? "anonymous"}`} />;
}

function MassMessagesScreen() {
  const { token, user } = useAuthContext();
  const { channels, templates, sectors } = useContext(WhatsappContext);
  const [filters, setFilters] = useCrmQueryState<ListFilters>("mass-messages-list", {
    campaignId: "",
    status: "",
    senderClientId: "",
    sendMode: "",
    page: 0,
    perPage: 10,
  });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [writeUnknown, setWriteUnknown] = useState(false);
  const [writeBusy, setWriteBusy] = useState(false);
  const writeLock = useRef(false);
  const readEpoch = useRef(0);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [campaignFilterOptions, setCampaignFilterOptions] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [totalRows, setTotalRows] = useState(0);
  const [summaryMap, setSummaryMap] = useState<Record<number, RowSummary>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [selectedDispatches, setSelectedDispatches] = useState<CampaignDispatchRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [audience, setAudience] = useState(emptyMassAudienceValue);
  const [audienceVersion, setAudienceVersion] = useState(0);
  const [creationSummary, setCreationSummary] = useState<AudienceCreationSummary | null>(null);
  const audienceClient = useRef(new MassAudienceClient());
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLButtonElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<DraftForm>({
    name: "",
    description: "",
    messageBody: "",
    senderClientId: "",
    contentMode: "text",
    templateName: "",
    scheduleMode: "ONE_TIME",
    startDate: dayjs().format("YYYY-MM-DD"),
    weekdays: ["1", "2", "3", "4", "5"],
    frequencyDays: "1",
    dayPeriodStart: "09:00",
    dayPeriodEnd: "12:00",
  });

  const canShowEmpty = !loading && !listError && campaigns.length === 0;
  const availableChannels = channels;
  const availableTemplates = templates;
  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.name === draft.templateName) || null,
    [availableTemplates, draft.templateName],
  );
  const templateVariables = useMemo<TemplateVariableMap>(
    () => ({
      atendente_nome: user?.NOME || "atendente",
      atendente_nome_exibição:
        (user as { NOME_EXIBICAO?: string | null } | null)?.NOME_EXIBICAO || "vendedor",
      cliente_razao: "Cliente",
      contato_nome_completo: "Contato Nome Completo",
      contato_primeiro_nome: "Contato",
      saudação_tempo: "Olá",
    }),
    [user],
  );
  const selectedTemplatePreview = useMemo(
    () => buildTemplatePreview(selectedTemplate, templateVariables),
    [selectedTemplate, templateVariables],
  );

  const loadCampaignFilterOptions = async () => {
    try {
      const response = await marketingService.listCampaigns({ page: 1, perPage: 100 });
      const options = response.data.map((campaign) => ({ id: campaign.id, name: campaign.name }));
      setCampaignFilterOptions(options);
    } catch {
      setCampaignFilterOptions([]);
    }
  };

  const loadCampaigns = async () => {
    const epoch = ++readEpoch.current;
    setLoading(true);

    try {
      const response = await marketingService.listCampaigns({
        page: filters.page + 1,
        perPage: filters.perPage,
        campaignId: filters.campaignId ? Number(filters.campaignId) : undefined,
        status: filters.status || undefined,
        senderClientId: filters.senderClientId ? Number(filters.senderClientId) : undefined,
        sendMode: (filters.sendMode || undefined) as
          | "IMMEDIATE"
          | "ONE_TIME"
          | "RECURRING"
          | undefined,
      });

      if (epoch !== readEpoch.current) return;
      const rows = response.data;
      setCampaigns(rows);
      setTotalRows(response.page.totalRows);
      setListError(false);

      const summaries = await Promise.all(
        rows.map(async (campaign) => {
          try {
            const summary = await marketingService.getMonitoring(campaign.id);
            return [
              campaign.id,
              { ...summary, dispatchesLabel: buildDispatchesLabel(summary) },
            ] as const;
          } catch {
            return [campaign.id, null] as const;
          }
        }),
      );

      if (epoch !== readEpoch.current) return;
      setSummaryMap(Object.fromEntries(summaries.filter((entry) => entry[1] !== null)));
    } catch {
      if (epoch === readEpoch.current) setListError(true);
    } finally {
      if (epoch === readEpoch.current) setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (writeLock.current || writeUnknown || !token || !audience.canCreate) return;
    if (!availableChannels.some((channel) => String(channel.id) === draft.senderClientId)) {
      toast.warning("Selecione um canal disponível.");
      return;
    }
    if (!draft.name.trim()) {
      toast.warning("Informe um título para o disparo.");
      return;
    }

    if (!draft.dayPeriodStart || !draft.dayPeriodEnd) {
      toast.warning("Informe o período do dia para envio.");
      return;
    }

    if (draft.dayPeriodStart >= draft.dayPeriodEnd) {
      toast.warning("O horário final deve ser maior que o inicial.");
      return;
    }

    if (draft.scheduleMode === "RECURRING" && draft.weekdays.length === 0) {
      toast.warning("Selecione ao menos um dia da semana para recorrência.");
      return;
    }

    if (draft.scheduleMode === "RECURRING" && Number(draft.frequencyDays) <= 0) {
      toast.warning("A frequência deve ser maior que zero.");
      return;
    }

    writeLock.current = true;
    setWriteBusy(true);
    try {
      const created = await audienceClient.current.create(token, {
        name: draft.name,
        description: draft.description,
        senderClientId: Number(draft.senderClientId),
        content:
          draft.contentMode === "text"
            ? { messageBody: draft.messageBody }
            : {
                templateName: draft.templateName,
                templateLanguage: selectedTemplate?.language || "pt_BR",
              },
        audienceDefinition: audience.definition,
        scheduleRule: {
          sendMode: draft.scheduleMode,
          startAt: `${draft.startDate}T00:00:00.000Z`,
          allowedWeekdaysJson:
            draft.scheduleMode === "RECURRING"
              ? draft.weekdays.map((day) => Number(day))
              : undefined,
          timeRangesJson: [
            {
              start: draft.dayPeriodStart,
              end: draft.dayPeriodEnd,
              frequencyDays:
                draft.scheduleMode === "RECURRING" ? Number(draft.frequencyDays) : undefined,
            },
          ],
        },
      });
      setCreationSummary(created.summary);
      toast.success("Disparo criado com público fixado.");
      setCreateOpen(false);
      setDraft({
        name: "",
        description: "",
        messageBody: "",
        senderClientId: "",
        contentMode: "text",
        templateName: "",
        scheduleMode: "ONE_TIME",
        startDate: dayjs().format("YYYY-MM-DD"),
        weekdays: ["1", "2", "3", "4", "5"],
        frequencyDays: "1",
        dayPeriodStart: "09:00",
        dayPeriodEnd: "12:00",
      });
      setAudience(emptyMassAudienceValue());
      setAudienceVersion((value) => value + 1);
      setSelectedFile(null);
      await loadCampaigns();
      await loadCampaignFilterOptions();
    } catch (error) {
      setWriteUnknown(crmError(error).reconcile);
      toast.error(
        "Não foi possível confirmar o cadastro. Confira a lista de disparos antes de tentar novamente.",
      );
    } finally {
      writeLock.current = false;
      setWriteBusy(false);
    }
  };

  const handleOpenDetails = async (campaign: MarketingCampaign) => {
    setSelectedCampaign(campaign);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(false);

    try {
      const [campaignDetail, dispatches] = await Promise.all([
        marketingService.getCampaignById(campaign.id).catch(() => campaign),
        marketingService.listDispatches(campaign.id, 1, 10),
      ]);
      setSelectedCampaign(campaignDetail);
      setSelectedDispatches(dispatches.data);
    } catch {
      setDetailsError(true);
      setSelectedDispatches([]);
      toast.error("Não foi possível consultar o acompanhamento do disparo.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCancel = async (campaign: MarketingCampaign) => {
    if (writeLock.current || writeUnknown) return;
    if (!confirm(`Cancelar o disparo "${campaign.name}"?`)) return;
    writeLock.current = true;
    setWriteBusy(true);
    try {
      const updated = await marketingService.cancelCampaign(campaign.id);
      setCampaigns((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      await loadCampaigns();
      toast.success("Disparo cancelado.");
    } catch (error) {
      setWriteUnknown(crmError(error).reconcile);
      toast.error(
        "Não foi possível confirmar o cancelamento. Atualize a lista para conferir o estado real.",
      );
    } finally {
      writeLock.current = false;
      setWriteBusy(false);
    }
  };

  useEffect(() => {
    void loadCampaigns();
    return () => {
      readEpoch.current++;
    };
  }, [
    filters.page,
    filters.perPage,
    filters.campaignId,
    filters.status,
    filters.senderClientId,
    filters.sendMode,
  ]);

  useEffect(() => {
    void loadCampaignFilterOptions();
  }, []);

  return (
    <CrmPage
      title="Disparos"
      description="Gerencie os disparos, o público e o acompanhamento dos envios."
      count={loading || listError ? undefined : totalRows}
      breadcrumbs={[{ label: "Disparos" }]}
      actions={
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Novo disparo
        </Button>
      }
    >
      {creationSummary && (
        <Alert severity="success">
          Público fixado: {creationSummary.selected} selecionados, {creationSummary.eligible}{" "}
          elegíveis, {creationSummary.blocked} bloqueados e {creationSummary.skipped} ignorados (
          {creationSummary.skippedReasons.CONTACT_NOT_FOUND} não encontrados;{" "}
          {creationSummary.skippedReasons.MISSING_PHONE} sem telefone).
        </Alert>
      )}
      {listError && (
        <Alert severity="error">
          Não foi possível atualizar os disparos. Os dados anteriores permanecem visíveis.
        </Alert>
      )}
      {writeUnknown && (
        <Alert severity="warning">
          Resultado da operação não confirmado. Confira o estado real na lista antes de tentar
          novamente.
        </Alert>
      )}
      <CrmFilters
        fields={[
          {
            key: "campaignId",
            label: "Disparo",
            options: campaignFilterOptions.map((option) => ({
              value: String(option.id),
              label: option.name,
            })),
          },
          {
            key: "senderClientId",
            label: "Canal",
            options: availableChannels.map((channel) => ({
              value: String(channel.id),
              label: channel.name,
            })),
          },
          {
            key: "status",
            label: "Status",
            options: statusOptions
              .filter((option) => option.value)
              .map((option) => ({ value: option.value, label: option.label })),
          },
          {
            key: "sendMode",
            label: "Modo de envio",
            options: sendModeOptions
              .filter((option) => option.value)
              .map((option) => ({ value: option.value, label: option.label })),
          },
        ]}
        values={{
          campaignId: filters.campaignId,
          senderClientId: filters.senderClientId,
          status: filters.status,
          sendMode: filters.sendMode,
        }}
        onApply={(next) =>
          setFilters((current) => ({
            ...current,
            campaignId: next.campaignId ?? "",
            senderClientId: next.senderClientId ?? "",
            status: next.status ?? "",
            sendMode: next.sendMode ?? "",
            page: 0,
          }))
        }
        onRefresh={() => void loadCampaigns()}
        loading={loading}
      />
      <div className="flex w-full flex-col gap-4">
        <TableContainer className="ip-crud-table scrollbar-whatsapp">
          <Table stickyHeader>
            <CrmTableHead
              labels={[
                "Título",
                "Criado por",
                "Criação",
                "Período",
                "Recorrência",
                "Contatos",
                "Status",
                "Acompanhamento",
                "Ações",
              ]}
            />
            <TableBody>
              {loading && (
                <TableRow sx={{ height: "300px" }}>
                  <TableCell colSpan={9} align="center" sx={{ borderBottom: "none" }}>
                    <div className="flex flex-col items-center gap-3 py-8">
                      <CircularProgress size={40} />
                      <span className="text-sm font-medium text-[var(--ip-text)]">
                        Carregando disparos...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {canShowEmpty && (
                <TableRow sx={{ height: "300px" }}>
                  <TableCell colSpan={9} align="center" sx={{ borderBottom: "none" }}>
                    <div className="flex flex-col items-center gap-2 py-8">
                      <span className="text-sm text-[var(--ip-muted)]">
                        Nenhum disparo encontrado
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                campaigns.map((campaign) => {
                  const summary = summaryMap[campaign.id];

                  return (
                    <TableRow
                      key={campaign.id}
                      className="transition-colors even:bg-indigo-700/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                      sx={{
                        "& .MuiTableCell-root": {
                          borderBottom: "1px solid",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
                        },
                      }}
                    >
                      <TableCell data-label="Título">
                        <div>
                          <p className="font-medium text-[var(--ip-text)]">{campaign.name}</p>
                          <p className="text-xs text-[var(--ip-muted)]">
                            {campaign.description || "Sem descricao"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell data-label="Criado por">{`Usuario #${campaign.createdBy}`}</TableCell>
                      <TableCell data-label="Criação">
                        {dayjs(campaign.createdAt).format("DD/MM/YYYY HH:mm")}
                      </TableCell>
                      <TableCell data-label="Período">{formatPeriod(campaign)}</TableCell>
                      <TableCell data-label="Recorrência">{formatRecurrence(campaign)}</TableCell>
                      <TableCell data-label="Contatos">
                        <span className="font-semibold">
                          {summary?.audience.totalSnapshots ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell data-label="Status">
                        <Chip
                          size="small"
                          label={getStatusLabel(campaign.status)}
                          color={statusColor(campaign.status)}
                        />
                      </TableCell>
                      <TableCell data-label="Acompanhamento">
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--ip-text)]">
                            {summary?.dispatchesLabel ?? "Acompanhamento indisponível"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell data-label="Ações" align="right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            title="Visualizar detalhes"
                            aria-label="Visualizar detalhes"
                            size="small"
                            onClick={() => void handleOpenDetails(campaign)}
                            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            title="Cancelar disparo"
                            aria-label="Cancelar disparo"
                            size="small"
                            disabled={
                              writeBusy ||
                              writeUnknown ||
                              ["CANCELLED", "COMPLETED"].includes(campaign.status)
                            }
                            onClick={() => void handleCancel(campaign)}
                            className="text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="flex items-center justify-end rounded-lg border border-[var(--ip-border)] bg-[var(--ip-surface)] px-4 py-3 shadow-none">
          <TablePagination
            component="div"
            count={Number(totalRows || 0)}
            page={filters.page}
            rowsPerPage={filters.perPage}
            labelRowsPerPage="Entradas por pagina"
            labelDisplayedRows={(info) => `${info.from}-${info.to} de ${info.count}`}
            onRowsPerPageChange={(event) =>
              setFilters((current) => ({
                ...current,
                perPage: Number(event.target.value),
                page: 0,
              }))
            }
            onPageChange={(_, newPage) => setFilters((current) => ({ ...current, page: newPage }))}
            sx={{
              ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                marginBottom: 0,
              },
            }}
          />
        </div>
      </div>

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!writeBusy) setCreateOpen(false);
        }}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,41,59,1) 100%)"
                : "linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(226,232,240,1) 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-none">
              <Send sx={{ fontSize: 18, color: "white" }} />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--ip-text)]">Novo disparo</p>
              <p className="text-xs text-[var(--ip-muted)]">
                Configure o canal, a mensagem e a lista de contatos
              </p>
            </div>
          </div>
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor: "background.default",
            paddingTop: "24px !important",
            paddingBottom: 3,
          }}
        >
          {writeUnknown && (
            <Alert severity="warning">
              Não foi possível confirmar o cadastro. O rascunho foi preservado; confira a lista
              antes de iniciar outra operação.
            </Alert>
          )}
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-3 shadow-none">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                    1
                  </span>
                  <p className="text-xs font-semibold text-[var(--ip-text)]">Configuração</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    className="col-span-2"
                    label="Titulo do disparo"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    size="small"
                    required
                  />
                  <TextField
                    select
                    label="WhatsApp"
                    value={draft.senderClientId}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, senderClientId: event.target.value }))
                    }
                    size="small"
                  >
                    {availableChannels.map((channel) => (
                      <MenuItem key={channel.id} value={String(channel.id)}>
                        {channel.name} • {channel.type}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Modo de envio"
                    value={draft.scheduleMode}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        scheduleMode: event.target.value as DraftForm["scheduleMode"],
                      }))
                    }
                    size="small"
                  >
                    {creationModeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Data inicial"
                    type="date"
                    value={draft.startDate}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, startDate: event.target.value }))
                    }
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Descricao"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    size="small"
                  />
                  {draft.scheduleMode === "RECURRING" && (
                    <>
                      <TextField
                        select
                        SelectProps={{
                          multiple: true,
                          renderValue: (selected) =>
                            (selected as string[])
                              .map(
                                (day) =>
                                  weekdayOptions.find((option) => option.value === day)?.label ||
                                  day,
                              )
                              .join(", "),
                        }}
                        label="Dias da semana"
                        value={draft.weekdays}
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            weekdays: typeof value === "string" ? value.split(",") : value,
                          }));
                        }}
                        size="small"
                      >
                        {weekdayOptions.map((day) => (
                          <MenuItem key={day.value} value={day.value}>
                            {day.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Frequencia (dias)"
                        type="number"
                        value={draft.frequencyDays}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, frequencyDays: event.target.value }))
                        }
                        size="small"
                        inputProps={{ min: 1, max: 365 }}
                      />
                    </>
                  )}
                  <TextField
                    label="Inicio do periodo"
                    type="time"
                    value={draft.dayPeriodStart}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, dayPeriodStart: event.target.value }))
                    }
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Fim do periodo"
                    type="time"
                    value={draft.dayPeriodEnd}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, dayPeriodEnd: event.target.value }))
                    }
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-3 shadow-none">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                      2
                    </span>
                    <p className="text-xs font-semibold text-[var(--ip-text)]">Conteúdo</p>
                  </div>
                  <ToggleButtonGroup
                    exclusive
                    value={draft.contentMode}
                    onChange={(_, value) =>
                      value && setDraft((current) => ({ ...current, contentMode: value }))
                    }
                    size="small"
                  >
                    <ToggleButton value="text">Mensagem</ToggleButton>
                    <ToggleButton value="template">Template</ToggleButton>
                  </ToggleButtonGroup>
                </div>

                {draft.contentMode === "text" ? (
                  <div className="grid gap-3">
                    <div className="relative">
                      <TextField
                        placeholder="Digite a mensagem que será enviada para os contatos selecionados..."
                        value={draft.messageBody}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          startTransition(() => {
                            setDraft((current) => ({ ...current, messageBody: nextValue }));
                          });
                        }}
                        size="small"
                        multiline
                        minRows={10}
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end" sx={{ alignSelf: "flex-start", mt: 1 }}>
                              <IconButton
                                size="small"
                                onClick={(e) => setEmojiAnchor((a) => (a ? null : e.currentTarget))}
                              >
                                <EmojiEmotions fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <AttachFile fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                      <Popover
                        open={Boolean(emojiAnchor)}
                        anchorEl={emojiAnchor}
                        onClose={() => setEmojiAnchor(null)}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        slotProps={{
                          paper: { sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } },
                        }}
                      >
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setDraft((current) => ({
                              ...current,
                              messageBody: `${current.messageBody}${emojiData.emoji}`,
                            }));
                            setEmojiAnchor(null);
                          }}
                          lazyLoadEmojis
                          height={320}
                        />
                      </Popover>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    />
                    {selectedFile && (
                      <Alert severity="info">Arquivo selecionado: {selectedFile.name}</Alert>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <Autocomplete
                      options={availableTemplates}
                      value={selectedTemplate}
                      onChange={(_, option) => {
                        setDraft((current) => ({ ...current, templateName: option?.name || "" }));
                      }}
                      getOptionLabel={(option) => option.name}
                      renderInput={(params) => (
                        <TextField {...params} label="Template" size="small" />
                      )}
                      renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                          <div>
                            <p className="text-sm font-medium">{option.name}</p>
                            <p className="text-xs text-[var(--ip-muted)]">
                              {option.category} • {option.language}
                            </p>
                          </div>
                        </li>
                      )}
                    />
                    {selectedTemplate && (
                      <div className="rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-3 text-sm text-[var(--ip-text)]">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ip-muted)]">
                          Pré-visualização do template
                        </p>
                        {selectedTemplatePreview ? (
                          selectedTemplatePreview
                            .split("\n")
                            .map((line, index) => (
                              <p key={`${selectedTemplate.id}-${index}`}>{line}</p>
                            ))
                        ) : (
                          <p>Nenhum conteúdo disponível para este template.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {createOpen && (
              <MassAudienceSelector
                key={audienceVersion}
                sectors={sectors}
                onChange={setAudience}
                disabled={writeBusy || writeUnknown}
              />
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid", borderColor: "divider", px: 3, py: 1.5 }}>
          <Button disabled={writeBusy} onClick={() => setCreateOpen(false)} color="inherit">
            Fechar
          </Button>
          <Button
            variant="contained"
            disabled={writeBusy || writeUnknown || !audience.canCreate}
            endIcon={<Send fontSize="small" />}
            onClick={() => void handleCreate()}
          >
            Criar disparo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,41,59,1) 100%)"
                : "linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(226,232,240,1) 100%)",
          }}
        >
          <div>
            <p className="text-lg font-semibold text-[var(--ip-text)]">Detalhes do disparo</p>
            <p className="mt-1 text-sm text-[var(--ip-text)]">
              Visao operacional resumida do disparo selecionado.
            </p>
          </div>
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor: "background.default",
            paddingTop: 3,
          }}
        >
          {!selectedCampaign || detailsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <CircularProgress />
            </div>
          ) : detailsError ? (
            <Alert severity="error">
              Não foi possível consultar os envios deste disparo. Tente atualizar os dados.
            </Alert>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ip-muted)]">
                    Disparo
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ip-text)]">
                    {selectedCampaign.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ip-muted)]">
                    {selectedCampaign.description || "Sem descricao"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ip-muted)]">
                    Status
                  </p>
                  <div className="mt-2">
                    <Chip
                      size="small"
                      label={getStatusLabel(selectedCampaign.status)}
                      color={statusColor(selectedCampaign.status)}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--ip-muted)]">
                    Atualizado em {dayjs(selectedCampaign.updatedAt).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ip-muted)]">
                    Criado por
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ip-text)]">{`Usuario #${selectedCampaign.createdBy}`}</p>
                  <p className="mt-1 text-xs text-[var(--ip-muted)]">
                    Em {dayjs(selectedCampaign.createdAt).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-4 shadow-none">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ip-muted)]">
                    Periodo
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ip-text)]">
                    {formatPeriod(selectedCampaign)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ip-muted)]">
                    Janela configurada para o disparo
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--ip-border)] bg-[var(--ip-surface)] p-4 shadow-none">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ip-text)]">
                      Ultimos destinatarios
                    </p>
                    <p className="text-xs text-[var(--ip-muted)]">
                      Acompanhamento mais recente do processamento desse disparo.
                    </p>
                  </div>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${selectedDispatches.length} registros`}
                    sx={{
                      borderColor: "divider",
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  {selectedDispatches.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-[var(--ip-border)] bg-[var(--ip-surface)] px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--ip-text)]">
                          {row.audienceSnapshot?.contactName || "Contato"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ip-muted)] text-[var(--ip-text)]">
                          {row.audienceSnapshot?.phoneE164 || "Sem telefone"}
                          {row.lastError ? ` • ${row.lastError}` : ""}
                        </p>
                      </div>
                      <Chip
                        size="small"
                        label={getStatusLabel(row.status)}
                        color={statusColor(row.status)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            paddingX: 3,
            paddingY: 2,
          }}
        >
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </CrmPage>
  );
}
