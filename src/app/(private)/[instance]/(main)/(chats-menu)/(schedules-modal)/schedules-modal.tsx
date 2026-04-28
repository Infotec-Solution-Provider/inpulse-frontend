import { useAuthContext } from "@/app/auth-context";
import CloseIcon from "@mui/icons-material/Close";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import {
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import {
  CustomerAgeLevel,
  CustomerInteractionLevel,
  CustomerProfileSummaryLevel,
  CustomerPurchaseInterestLevel,
  CustomerPurchaseLevel,
  UnifiedSchedule,
  UnifiedScheduleFilters,
  UnifiedSchedulesResponse,
  UnifiedScheduleRepurchaseStatus,
} from "@in.pulse-crm/sdk";
import { useDeferredValue, useEffect, useState } from "react";
import { useWhatsappContext } from "../../../whatsapp-context";

interface ScheduleDetailRow {
  label: string;
  value: string;
}

interface CampaignOption {
  id: string;
  label: string;
}

interface SchedulesModalItem {
  key: string;
  channel: UnifiedSchedule["channel"];
  channelLabel: string;
  id: number;
  scheduleAt: string;
  scheduleMs: number;
  customerName: string;
  customerCampaignId: number | null;
  customerCampaignName: string | null;
  customerOriginDescription: string | null;
  primaryLabel: string;
  primaryValue: string;
  secondaryValue: string | null;
  description: string | null;
  telephonyCampaignName: string | null;
  profileSummaryLabel: string | null;
  profileTagSummary: string[];
  repurchaseStatus: UnifiedScheduleRepurchaseStatus;
  repurchaseLabel: string;
  searchableText: string;
  detailRows: ScheduleDetailRow[];
}

interface FilterState {
  channels: string[];
  customerCampaignIds: string[];
  profileLevel: string;
  interactionLevel: string;
  purchaseLevel: string;
  ageLevel: string;
  purchaseInterestLevel: string;
  repurchaseStatuses: string[];
}

const initialFilters: FilterState = {
  channels: [],
  customerCampaignIds: [],
  profileLevel: "",
  interactionLevel: "",
  purchaseLevel: "",
  ageLevel: "",
  purchaseInterestLevel: "",
  repurchaseStatuses: [],
};

const channelOptions = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TELEFONIA", label: "Telefonia" },
];

const repurchaseStatusOptions: Array<{ value: UnifiedScheduleRepurchaseStatus; label: string }> = [
  { value: "green", label: "Pronto para comprar" },
  { value: "yellow", label: "Próximo da recompra" },
  { value: "red", label: "Longe da recompra" },
  { value: "neutral", label: "Sem histórico" },
];

const profileLevelOptions: Array<{ value: CustomerProfileSummaryLevel; label: string }> = [
  { value: "potencial_de_compra", label: "Potencial de compra" },
  { value: "consolidado", label: "Consolidado" },
  { value: "precisa_mais_interacao", label: "Precisa mais interação" },
  { value: "em_observacao", label: "Em observação" },
];

const interactionLevelOptions: Array<{ value: CustomerInteractionLevel; label: string }> = [
  { value: "sem_interacao", label: "Sem interação" },
  { value: "pouca_interacao", label: "Pouca interação" },
  { value: "interacao_media", label: "Interação média" },
  { value: "interacao_alta", label: "Interação alta" },
];

const purchaseLevelOptions: Array<{ value: CustomerPurchaseLevel; label: string }> = [
  { value: "sem_compras", label: "Sem compras" },
  { value: "poucas_compras", label: "Poucas compras" },
  { value: "compras_medias", label: "Compras médias" },
  { value: "muitas_compras", label: "Muitas compras" },
];

const ageLevelOptions: Array<{ value: CustomerAgeLevel; label: string }> = [
  { value: "sem_data_cadastro", label: "Sem data de cadastro" },
  { value: "cliente_novo", label: "Cliente novo" },
  { value: "ate_6_meses", label: "Até 6 meses" },
  { value: "ate_12_meses", label: "Até 12 meses" },
  { value: "mais_de_12_meses", label: "Mais de 12 meses" },
];

const purchaseInterestOptions: Array<{ value: CustomerPurchaseInterestLevel; label: string }> = [
  { value: "nao_analisado", label: "Não analisado" },
  { value: "baixo_interesse", label: "Baixo interesse" },
  { value: "interesse_moderado", label: "Interesse moderado" },
  { value: "alto_interesse", label: "Alto interesse" },
  { value: "pronto_para_compra", label: "Pronto para compra" },
];

interface Props {
  onClose: () => void;
}

export default function SchedulesModal({ onClose }: Props) {
  const { wppApi } = useWhatsappContext();
  const { token, user } = useAuthContext();
  const [schedules, setSchedules] = useState<SchedulesModalItem[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignOption[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState("10");
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [loading, setLoading] = useState(true);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const parseDate = (value: string | Date | null | undefined) => {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    return new Date(value.includes("T") ? value : value.replace(" ", "T"));
  };

  const formatDateTime = (value: string | Date) => {
    const d = parseDate(value);

    if (!d) {
      return "—";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  };

  const getScheduleMs = (value: string | Date) => parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;

  const normalizeText = (value: string | null | undefined) =>
    (value || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  const buildSearchableText = (parts: Array<string | null | undefined>) =>
    normalizeText(parts.filter(Boolean).join(" "));

  const getRepurchaseLabel = (status: UnifiedScheduleRepurchaseStatus) => {
    const option = repurchaseStatusOptions.find((item) => item.value === status);
    return option?.label || "Sem histórico";
  };

  const mapUnifiedSchedule = (schedule: UnifiedSchedule): SchedulesModalItem => {
    const customerName = schedule.customerName || schedule.customerFantasyName || "—";
    const profileTagSummary = [
      schedule.profileSummary?.tags.interaction?.label,
      schedule.profileSummary?.tags.purchase?.label,
      schedule.profileSummary?.tags.age?.label,
    ].filter((value): value is string => Boolean(value));

    return {
      key: schedule.id,
      channel: schedule.channel,
      channelLabel: schedule.channel === "WHATSAPP" ? "WhatsApp" : "Telefonia",
      id: schedule.scheduleId,
      scheduleAt: schedule.scheduleAt,
      scheduleMs: getScheduleMs(schedule.scheduleAt),
      customerName,
      customerCampaignId: schedule.customerCampaignId,
      customerCampaignName: schedule.customerCampaignName,
      customerOriginDescription: schedule.customerOriginDescription,
      primaryLabel: schedule.channel === "WHATSAPP" ? "Contato" : "Telefone",
      primaryValue: schedule.contactName || schedule.contactPhone || "—",
      secondaryValue:
        schedule.channel === "WHATSAPP"
          ? schedule.contactPhone
          : schedule.telephonyCampaignName || schedule.contactName,
      description: schedule.description,
      telephonyCampaignName: schedule.telephonyCampaignName,
      profileSummaryLabel: schedule.profileSummary?.label || null,
      profileTagSummary,
      repurchaseStatus: schedule.repurchase?.semaphoreStatus || "neutral",
      repurchaseLabel: getRepurchaseLabel(schedule.repurchase?.semaphoreStatus || "neutral"),
      searchableText: buildSearchableText([
        schedule.contactName,
        schedule.contactPhone,
        customerName,
        schedule.customerCampaignName,
        schedule.customerOriginDescription,
        schedule.telephonyCampaignName,
        schedule.profileSummary?.label,
        ...profileTagSummary,
      ]),
      detailRows: [
        { label: "Canal", value: schedule.channel === "WHATSAPP" ? "WhatsApp" : "Telefonia" },
        { label: "Origem", value: schedule.customerOriginDescription || "—" },
        { label: "Campanha do cliente", value: schedule.customerCampaignName || "—" },
        ...(schedule.telephonyCampaignName
          ? [{ label: "Campanha operacional", value: schedule.telephonyCampaignName }]
          : []),
        { label: "Perfil", value: schedule.profileSummary?.label || "—" },
        { label: "Recompra", value: getRepurchaseLabel(schedule.repurchase?.semaphoreStatus || "neutral") },
      ],
    };
  };

  const activeFiltersCount =
    filters.channels.length +
    filters.customerCampaignIds.length +
    filters.repurchaseStatuses.length +
    (filters.profileLevel ? 1 : 0) +
    (filters.interactionLevel ? 1 : 0) +
    (filters.purchaseLevel ? 1 : 0) +
    (filters.ageLevel ? 1 : 0) +
    (filters.purchaseInterestLevel ? 1 : 0);

  const buildApiFilters = (): UnifiedScheduleFilters => ({
    page: String(page),
    perPage,
    ...(filters.channels.length ? { channels: filters.channels.join(",") } : {}),
    ...(filters.customerCampaignIds.length
      ? { customerCampaignIds: filters.customerCampaignIds.join(",") }
      : {}),
    ...(filters.repurchaseStatuses.length
      ? { repurchaseStatuses: filters.repurchaseStatuses.join(",") }
      : {}),
    ...(filters.profileLevel ? { profileLevel: filters.profileLevel as CustomerProfileSummaryLevel } : {}),
    ...(filters.interactionLevel
      ? { interactionLevel: filters.interactionLevel as CustomerInteractionLevel }
      : {}),
    ...(filters.purchaseLevel ? { purchaseLevel: filters.purchaseLevel as CustomerPurchaseLevel } : {}),
    ...(filters.ageLevel ? { ageLevel: filters.ageLevel as CustomerAgeLevel } : {}),
    ...(filters.purchaseInterestLevel
      ? { purchaseInterestLevel: filters.purchaseInterestLevel as CustomerPurchaseInterestLevel }
      : {}),
  });

  const normalizedSearchTerm = normalizeText(deferredSearchTerm);
  const filteredSchedules = schedules.filter((schedule) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    return schedule.searchableText.includes(normalizedSearchTerm);
  });

  const toggleExpanded = (key: string) => {
    setExpandedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const handleMultiSelectChange = (field: keyof Pick<FilterState, "channels" | "customerCampaignIds" | "repurchaseStatuses">) =>
    (event: SelectChangeEvent<string[]>) => {
      const value = event.target.value;
      setPage(1);
      setFilters((current) => ({
        ...current,
        [field]: typeof value === "string" ? value.split(",") : value,
      }));
    };

  const handleSingleSelectChange = (
    field: keyof Omit<FilterState, "channels" | "customerCampaignIds" | "repurchaseStatuses">,
  ) =>
    (event: SelectChangeEvent<string>) => {
      setPage(1);
      setFilters((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handlePerPageChange = (event: SelectChangeEvent<string>) => {
    setPerPage(event.target.value);
    setPage(1);
  };

  const applyResponseState = (response: UnifiedSchedulesResponse) => {
    const list = response.data
      .map(mapUnifiedSchedule)
      .sort((first: SchedulesModalItem, second: SchedulesModalItem) => first.scheduleMs - second.scheduleMs);

    setSchedules(list);
    setAvailableCampaigns(response.filters.customerCampaigns);
    setTotalRows(response.pagination.totalRows);
    setTotalPages(response.pagination.totalPages || 1);
    setPage(response.pagination.current || 1);
    setExpandedKeys([]);
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!wppApi.current || !user || !token) {
        return;
      }

      setLoading(true);

      try {
        wppApi.current.setAuth(token);
        const response = await wppApi.current.getUnifiedSchedules(buildApiFilters());

        if (!mounted) return;

        applyResponseState(response);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [filters, page, perPage, token, user, wppApi]);

  return (
    <div className="w-[48rem] max-w-[92vw] rounded-xl bg-slate-100 px-4 py-4 text-slate-800 shadow-xl dark:bg-slate-900 dark:text-slate-200">
      <header className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h1 className="text-lg font-semibold">Meus Agendamentos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {loading
              ? "Carregando agendamentos..."
              : `${filteredSchedules.length} de ${schedules.length} na página • ${totalRows} no total`}
          </p>
        </div>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FilterAltIcon className="text-slate-500" fontSize="small" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filtros</h2>
            {activeFiltersCount > 0 ? <Chip size="small" label={activeFiltersCount} /> : null}
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Limpar filtros
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-channel-label">Canal</InputLabel>
            <Select
              multiple
              labelId="schedule-channel-label"
              value={filters.channels}
              label="Canal"
              onChange={handleMultiSelectChange("channels")}
            >
              {channelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-campaign-label">Campanha do cliente</InputLabel>
            <Select
              multiple
              labelId="schedule-campaign-label"
              value={filters.customerCampaignIds}
              label="Campanha do cliente"
              onChange={handleMultiSelectChange("customerCampaignIds")}
            >
              {availableCampaigns.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-repurchase-label">Recompra</InputLabel>
            <Select
              multiple
              labelId="schedule-repurchase-label"
              value={filters.repurchaseStatuses}
              label="Recompra"
              onChange={handleMultiSelectChange("repurchaseStatuses")}
            >
              {repurchaseStatusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-profile-label">Perfil</InputLabel>
            <Select
              labelId="schedule-profile-label"
              value={filters.profileLevel}
              label="Perfil"
              onChange={handleSingleSelectChange("profileLevel")}
            >
              <MenuItem value="">Todos</MenuItem>
              {profileLevelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-interaction-label">Tag de interação</InputLabel>
            <Select
              labelId="schedule-interaction-label"
              value={filters.interactionLevel}
              label="Tag de interação"
              onChange={handleSingleSelectChange("interactionLevel")}
            >
              <MenuItem value="">Todas</MenuItem>
              {interactionLevelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-purchase-label">Tag de compra</InputLabel>
            <Select
              labelId="schedule-purchase-label"
              value={filters.purchaseLevel}
              label="Tag de compra"
              onChange={handleSingleSelectChange("purchaseLevel")}
            >
              <MenuItem value="">Todas</MenuItem>
              {purchaseLevelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-age-label">Tag de idade</InputLabel>
            <Select
              labelId="schedule-age-label"
              value={filters.ageLevel}
              label="Tag de idade"
              onChange={handleSingleSelectChange("ageLevel")}
            >
              <MenuItem value="">Todas</MenuItem>
              {ageLevelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="schedule-interest-label">Interesse de compra</InputLabel>
            <Select
              labelId="schedule-interest-label"
              value={filters.purchaseInterestLevel}
              label="Interesse de compra"
              onChange={handleSingleSelectChange("purchaseInterestLevel")}
            >
              <MenuItem value="">Todos</MenuItem>
              {purchaseInterestOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/70">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Busca complementar
          </label>
          <div className="flex items-center gap-3">
            <SearchIcon className="text-slate-400" fontSize="small" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por contato, cliente, campanha ou origem"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={clearSearch}
                className="shrink-0 text-xs font-medium text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircularProgress size={24} />
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Nenhum agendamento encontrado.
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhum agendamento encontrado para a busca atual.
          </div>
        ) : (
          <>
            <ul className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
              {filteredSchedules.map((s) => {
                const isExpanded = expandedKeys.includes(s.key);

                return (
                  <li
                    key={s.key}
                    className="rounded-xl border border-slate-300 bg-white p-3 shadow-sm transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-500">ID #{s.id}</div>
                        <Chip
                          label={s.channelLabel}
                          size="small"
                          color={s.channel === "WHATSAPP" ? "success" : "primary"}
                          variant="outlined"
                        />
                        {s.customerCampaignName ? (
                          <Chip label={s.customerCampaignName} size="small" variant="filled" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          Agendado para: {formatDateTime(s.scheduleAt)}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(s.key)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {isExpanded ? "Menos" : "Detalhes"}
                          {isExpanded ? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-1 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{s.primaryLabel}: </span>
                      <span className="break-words">{s.primaryValue}</span>
                      {s.secondaryValue ? <span className="text-slate-500"> • {s.secondaryValue}</span> : null}
                    </div>

                    <div className="mb-1 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">Cliente: </span>
                      <span className="break-words">{s.customerName}</span>
                    </div>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                        <div className="grid gap-3 md:grid-cols-2">
                          {s.detailRows.map((detail) => (
                            <div key={`${s.key}-${detail.label}`} className="rounded-md bg-white/80 p-2 dark:bg-slate-800/80">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {detail.label}
                              </div>
                              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{detail.value}</div>
                            </div>
                          ))}
                        </div>

                        {s.profileTagSummary.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {s.profileTagSummary.map((tag) => (
                              <Chip key={`${s.key}-${tag}`} label={tag} size="small" variant="outlined" />
                            ))}
                          </div>
                        ) : null}

                        {s.description ? (
                          <div className="mt-3 rounded-md bg-white/80 p-2 dark:bg-slate-800/80">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {s.channel === "WHATSAPP" ? "Descrição" : "Detalhe"}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                              {s.description}
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-md bg-white/80 p-2 dark:bg-slate-800/80">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Origem do cliente
                            </div>
                            <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                              {s.customerOriginDescription || "—"}
                            </div>
                          </div>
                          <div className="rounded-md bg-white/80 p-2 dark:bg-slate-800/80">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Situação de recompra
                            </div>
                            <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                              {s.repurchaseLabel}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Collapse>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/70 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/60 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span>Itens por página</span>
                <FormControl size="small">
                  <Select value={perPage} onChange={handlePerPageChange}>
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                  </Select>
                </FormControl>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Página {page} de {totalPages}
                </div>
                <Pagination
                  color="primary"
                  count={totalPages}
                  page={page}
                  onChange={(_, nextPage) => setPage(nextPage)}
                  size="small"
                  showFirstButton
                  showLastButton
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
