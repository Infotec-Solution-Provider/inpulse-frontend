"use client";

import { useAuthContext } from "@/app/auth-context";
import filesService from "@/lib/services/files.service";
import type {
  AiAgent,
  AiAgentActionType,
  AiAgentAudienceFilters,
  AiAgentKnowledgeEntryInput,
  AiAgentProactiveConfig,
  AiAgentProactiveEntryMessageMode,
  AiAgentProactiveFrequency,
  AiAgentTriggerInput,
  AiAgentTriggerType,
  CreateAiAgentInput,
  CustomerAgeLevel,
  CustomerInteractionLevel,
  CustomerLookupOption,
  CustomerProfileSummaryLevel,
  CustomerPurchaseInterestLevel,
  CustomerPurchaseLevel,
  WppContactWithCustomer,
} from "@/lib/types/sdk-local.types";
import instancesService, { type GeoStateOption } from "@/lib/services/instances.service";
import { FileDirType } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { type MessageTemplate, useWhatsappContext } from "../../../whatsapp-context";
import AddIcon from "@mui/icons-material/Add";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import Groups2Icon from "@mui/icons-material/Groups2";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SaveIcon from "@mui/icons-material/Save";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAiAgentsContext } from "../ai-agents-context";
import FilePicker from "../../ready-messages/(modal)/file-picker";

const ALL_ACTIONS: { value: AiAgentActionType; label: string; description: string }[] = [
  { value: "REPLY", label: "Responder", description: "Permite que o agente responda mensagens diretamente." },
  {
    value: "SEND_TEMPLATE",
    label: "Enviar template WABA",
    description: "Libera o disparo de templates aprovados no WhatsApp Business API.",
  },
  { value: "SEND_FILE", label: "Enviar arquivo", description: "Autoriza o envio de anexos e materiais de apoio." },
  { value: "ESCALATE", label: "Escalar para humano", description: "Encaminha a conversa para carteira ou operador." },
  { value: "CLOSE_CHAT", label: "Fechar conversa", description: "Permite encerrar o atendimento automaticamente." },
  { value: "IGNORED", label: "Ignorar mensagem", description: "Permite decidir que uma mensagem nao deve receber resposta." },
];

const ALL_TRIGGERS: { value: AiAgentTriggerType; label: string; description: string }[] = [
  {
    value: "MESSAGE_DURING_HOURS",
    label: "Mensagem dentro do horario",
    description: "Aciona quando chega uma nova mensagem do cliente dentro da janela de horario configurada.",
  },
  {
    value: "RESPONSE_TIMEOUT",
    label: "Timeout de resposta",
    description: "Reage quando o cliente fica sem retorno pelo tempo configurado para espera.",
  },
  {
    value: "KEYWORD",
    label: "Palavra-chave",
    description: "Aciona para mensagens que batem com palavras configuradas no gatilho.",
  },
  {
    value: "ALWAYS",
    label: "Sempre",
    description: "Mantem o agente elegivel em qualquer mensagem compatível com o publico.",
  },
];

const PROACTIVE_FREQUENCY_OPTIONS: { value: AiAgentProactiveFrequency; label: string; description: string }[] = [
  {
    value: "DAILY",
    label: "Todos os dias",
    description: "Executa uma rodada por dia no horario informado.",
  },
  {
    value: "WEEKDAYS",
    label: "Dias uteis",
    description: "Executa automaticamente de segunda a sexta.",
  },
  {
    value: "CUSTOM_DAYS",
    label: "Dias customizados",
    description: "Permite escolher exatamente em quais dias da semana o agente dispara.",
  },
];

const ENTRY_MESSAGE_MODE_OPTIONS: { value: AiAgentProactiveEntryMessageMode; label: string; description: string }[] = [
  {
    value: "AI_TEXT",
    label: "Texto gerado por IA",
    description: "Abre a conversa com uma primeira mensagem escrita pelo modelo configurado.",
  },
  {
    value: "WABA_TEMPLATE",
    label: "Template WABA",
    description: "Inicia a abordagem usando um template oficial do WhatsApp Business.",
  },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
];

const TIMEZONE_OPTIONS = [
  "America/Sao_Paulo",
  "America/Fortaleza",
  "America/Recife",
  "America/Manaus",
  "America/Cuiaba",
  "America/Belem",
  "America/Porto_Velho",
];

const DEFAULT_MESSAGE_DURING_HOURS_TRIGGER_CONFIG = {
  startTime: "09:00",
  endTime: "18:00",
  timezone: "America/Sao_Paulo",
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const MODEL_OPTIONS = ["gpt-5.4", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];

const PROFILE_LEVEL_OPTIONS: { value: CustomerProfileSummaryLevel; label: string }[] = [
  { value: "potencial_de_compra", label: "Potencial de compra" },
  { value: "consolidado", label: "Consolidado" },
  { value: "precisa_mais_interacao", label: "Precisa de mais interacao" },
  { value: "em_observacao", label: "Em observacao" },
];

const INTERACTION_LEVEL_OPTIONS: { value: CustomerInteractionLevel; label: string }[] = [
  { value: "sem_interacao", label: "Sem interacao" },
  { value: "pouca_interacao", label: "Pouca interacao" },
  { value: "interacao_media", label: "Interacao media" },
  { value: "interacao_alta", label: "Interacao alta" },
];

const PURCHASE_LEVEL_OPTIONS: { value: CustomerPurchaseLevel; label: string }[] = [
  { value: "sem_compras", label: "Sem compras" },
  { value: "poucas_compras", label: "Poucas compras" },
  { value: "compras_medias", label: "Compras medias" },
  { value: "muitas_compras", label: "Muitas compras" },
];

const AGE_LEVEL_OPTIONS: { value: CustomerAgeLevel; label: string }[] = [
  { value: "sem_data_cadastro", label: "Sem data de cadastro" },
  { value: "cliente_novo", label: "Cliente novo" },
  { value: "ate_6_meses", label: "Ate 6 meses" },
  { value: "ate_12_meses", label: "Ate 12 meses" },
  { value: "mais_de_12_meses", label: "Mais de 12 meses" },
];

const PURCHASE_INTEREST_OPTIONS: { value: CustomerPurchaseInterestLevel; label: string }[] = [
  { value: "nao_analisado", label: "Nao analisado" },
  { value: "baixo_interesse", label: "Baixo interesse" },
  { value: "interesse_moderado", label: "Interesse moderado" },
  { value: "alto_interesse", label: "Alto interesse" },
  { value: "pronto_para_compra", label: "Pronto para compra" },
];

const PREVIEW_PAGE_SIZE = 8;
const EMPTY_ICON = <CheckBoxOutlineBlankIcon fontSize="small" />;
const CHECKED_ICON = <CheckBoxIcon fontSize="small" />;

interface Props {
  agent?: AiAgent;
  onClose: () => void;
}

type FormState = {
  name: string;
  description: string;
  enabled: boolean;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxTurnsPerChat: number;
  allowedActions: AiAgentActionType[];
  templateName: string;
  templateLanguage: string;
  escalateToWalletId: string;
  escalateToUserId: string;
};

type AudienceFormState = {
  profileLevel: CustomerProfileSummaryLevel | "";
  interactionLevel: CustomerInteractionLevel | "";
  purchaseLevel: CustomerPurchaseLevel | "";
  ageLevel: CustomerAgeLevel | "";
  purchaseInterestLevel: CustomerPurchaseInterestLevel | "";
  state: string;
  city: string;
  segmentIds: number[];
  campaignIds: number[];
  operatorIds: number[];
};

type ProactiveFormState = {
  enabled: boolean;
  frequency: AiAgentProactiveFrequency;
  timezone: string;
  startTime: string;
  daysOfWeek: number[];
  batchSize: number;
  entryMessageMode: AiAgentProactiveEntryMessageMode;
  skipContactsWithOpenChat: boolean;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  enabled: true,
  systemPrompt: "",
  model: "gpt-5.4",
  temperature: 0.7,
  maxTokens: 1000,
  maxTurnsPerChat: 10,
  allowedActions: ["REPLY"],
  templateName: "",
  templateLanguage: "pt_BR",
  escalateToWalletId: "",
  escalateToUserId: "",
};

const DEFAULT_AUDIENCE_FORM: AudienceFormState = {
  profileLevel: "",
  interactionLevel: "",
  purchaseLevel: "",
  ageLevel: "",
  purchaseInterestLevel: "",
  state: "",
  city: "",
  segmentIds: [],
  campaignIds: [],
  operatorIds: [],
};

const DEFAULT_PROACTIVE_FORM: ProactiveFormState = {
  enabled: false,
  frequency: "WEEKDAYS",
  timezone: "America/Sao_Paulo",
  startTime: "09:00",
  daysOfWeek: [],
  batchSize: 20,
  entryMessageMode: "AI_TEXT",
  skipContactsWithOpenChat: true,
};

function sanitizeIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return [...new Set(values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))].sort(
    (left, right) => left - right,
  );
}

function sanitizeDaysOfWeek(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return [...new Set(values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6))].sort(
    (left, right) => left - right,
  );
}

function getAudienceFormState(agent?: AiAgent): AudienceFormState {
  const filters = (agent?.audience?.filtersJson ?? {}) as Partial<AiAgentAudienceFilters>;

  return {
    profileLevel: filters.profileLevel ?? "",
    interactionLevel: filters.interactionLevel ?? "",
    purchaseLevel: filters.purchaseLevel ?? "",
    ageLevel: filters.ageLevel ?? "",
    purchaseInterestLevel: filters.purchaseInterestLevel ?? "",
    state: typeof filters.state === "string" ? filters.state.trim().toUpperCase() : "",
    city: filters.city ?? "",
    segmentIds: sanitizeIds(filters.segmentIds),
    campaignIds: sanitizeIds(filters.campaignIds),
    operatorIds: sanitizeIds(filters.operatorIds),
  };
}

function getProactiveFormState(agent?: AiAgent): ProactiveFormState {
  const proactive = agent?.proactiveConfig;

  return {
    enabled: proactive?.enabled ?? false,
    frequency: proactive?.schedule.frequency ?? DEFAULT_PROACTIVE_FORM.frequency,
    timezone: proactive?.schedule.timezone ?? DEFAULT_PROACTIVE_FORM.timezone,
    startTime: proactive?.schedule.startTime ?? DEFAULT_PROACTIVE_FORM.startTime,
    daysOfWeek: sanitizeDaysOfWeek(proactive?.schedule.daysOfWeek),
    batchSize: proactive?.batchSize ?? DEFAULT_PROACTIVE_FORM.batchSize,
    entryMessageMode: proactive?.entryMessageMode ?? DEFAULT_PROACTIVE_FORM.entryMessageMode,
    skipContactsWithOpenChat:
      proactive?.skipContactsWithOpenChat ?? DEFAULT_PROACTIVE_FORM.skipContactsWithOpenChat,
  };
}

function buildProactiveConfig(proactive: ProactiveFormState): AiAgentProactiveConfig | null {
  if (!proactive.enabled) {
    return null;
  }

  return {
    enabled: true,
    schedule: {
      frequency: proactive.frequency,
      timezone: proactive.timezone.trim() || DEFAULT_PROACTIVE_FORM.timezone,
      startTime: proactive.startTime,
      daysOfWeek: proactive.frequency === "CUSTOM_DAYS" ? sanitizeDaysOfWeek(proactive.daysOfWeek) : [],
    },
    batchSize: proactive.batchSize,
    entryMessageMode: proactive.entryMessageMode,
    skipContactsWithOpenChat: proactive.skipContactsWithOpenChat,
  };
}

function buildAudienceInput(audience: AudienceFormState) {
  const filters: AiAgentAudienceFilters = {};

  if (audience.profileLevel) filters.profileLevel = audience.profileLevel;
  if (audience.interactionLevel) filters.interactionLevel = audience.interactionLevel;
  if (audience.purchaseLevel) filters.purchaseLevel = audience.purchaseLevel;
  if (audience.ageLevel) filters.ageLevel = audience.ageLevel;
  if (audience.purchaseInterestLevel) filters.purchaseInterestLevel = audience.purchaseInterestLevel;
  if (audience.state.trim()) filters.state = audience.state.trim().toUpperCase();
  if (audience.city.trim()) filters.city = audience.city.trim();

  const segmentIds = sanitizeIds(audience.segmentIds);
  const campaignIds = sanitizeIds(audience.campaignIds);
  const operatorIds = sanitizeIds(audience.operatorIds);

  if (segmentIds.length > 0) filters.segmentIds = segmentIds;
  if (campaignIds.length > 0) filters.campaignIds = campaignIds;
  if (operatorIds.length > 0) filters.operatorIds = operatorIds;

  return { filters };
}

function hasAudienceFilters(audience: AudienceFormState) {
  return Object.keys(buildAudienceInput(audience).filters ?? {}).length > 0;
}

function audienceSnapshot(audience: AudienceFormState) {
  return JSON.stringify(buildAudienceInput(audience).filters ?? {});
}

function getLookupLabel(option: CustomerLookupOption) {
  return option.NOME?.trim() || `Codigo ${option.CODIGO}`;
}

function getCustomerLabel(agentContact: WppContactWithCustomer) {
  return agentContact.customer?.FANTASIA?.trim() || agentContact.customer?.RAZAO?.trim() || "Sem cliente vinculado";
}

function getTemplateIdentity(template: Pick<MessageTemplate, "name" | "language">) {
  return `${template.name}::${template.language}`;
}

function getTriggerConfig(trigger: AiAgentTriggerInput) {
  return trigger.config ?? {};
}

function normalizeTriggers(triggers: AiAgentTriggerInput[]) {
  return triggers.map((trigger) => {
    if (trigger.type === "MESSAGE_DURING_HOURS") {
      const startTime = String(getTriggerConfig(trigger).startTime ?? "").trim();
      const endTime = String(getTriggerConfig(trigger).endTime ?? "").trim();
      const timezone = String(getTriggerConfig(trigger).timezone ?? "").trim();

      return {
        type: trigger.type,
        config: {
          ...(startTime ? { startTime } : {}),
          ...(endTime ? { endTime } : {}),
          ...(timezone ? { timezone } : {}),
        },
      } satisfies AiAgentTriggerInput;
    }

    if (trigger.type === "RESPONSE_TIMEOUT") {
      const timeoutMinutes = Number(getTriggerConfig(trigger).timeoutMinutes);

      return {
        type: trigger.type,
        config: Number.isInteger(timeoutMinutes) && timeoutMinutes > 0 ? { timeoutMinutes } : {},
      } satisfies AiAgentTriggerInput;
    }

    if (trigger.type === "KEYWORD") {
      const keywords = (getTriggerConfig(trigger).keywords ?? [])
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      return {
        type: trigger.type,
        config: keywords.length > 0 ? { keywords } : {},
      } satisfies AiAgentTriggerInput;
    }

    return {
      type: trigger.type,
      config: {},
    } satisfies AiAgentTriggerInput;
  });
}

function HelpLabel({ label, tooltip, required = false }: { label: string; tooltip?: string; required?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
        {label}
        {required ? " *" : ""}
      </Typography>
      {tooltip && (
        <Tooltip title={tooltip} placement="top">
          <IconButton size="small" sx={{ p: 0.25, color: "text.secondary" }}>
            <InfoOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export default function AgentModal({ agent, onClose }: Props) {
  const theme = useTheme();
  const { instance } = useAuthContext();
  const { templates } = useWhatsappContext();
  const {
    agents,
    createAgent,
    updateAgent,
    saveAgentAudience,
    previewAgentAudience,
    audiencePreview,
    audiencePreviewLoading,
    clearAudiencePreview,
    campaignOptions,
    segmentOptions,
    operatorOptions,
    lookupsLoading,
    addKnowledgeEntry,
    deleteKnowledgeEntry,
  } = useAiAgentsContext();
  const isEdit = !!agent;
  const knowledgeTabIndex = isEdit ? 4 : -1;

  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [stateOptions, setStateOptions] = useState<GeoStateOption[]>([]);
  const [stateOptionsLoading, setStateOptionsLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [cityOptionsLoading, setCityOptionsLoading] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    agent
      ? {
          name: agent.name,
          description: agent.description ?? "",
          enabled: agent.enabled,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          maxTurnsPerChat: agent.maxTurnsPerChat,
          allowedActions: agent.allowedActions,
          templateName: agent.templateName ?? "",
          templateLanguage: agent.templateLanguage ?? "pt_BR",
          escalateToWalletId: agent.escalateToWalletId?.toString() ?? "",
          escalateToUserId: agent.escalateToUserId?.toString() ?? "",
        }
      : DEFAULT_FORM,
  );
  const [triggers, setTriggers] = useState<AiAgentTriggerInput[]>(
    agent?.triggers.map((trigger) => ({
      type: trigger.type,
      config: trigger.config as AiAgentTriggerInput["config"],
    })) ?? [],
  );
  const [receptiveEnabled, setReceptiveEnabled] = useState<boolean>(() => (agent?.triggers.length ?? 0) > 0);
  const [proactive, setProactive] = useState<ProactiveFormState>(() => getProactiveFormState(agent));
  const [audience, setAudience] = useState<AudienceFormState>(() => getAudienceFormState(agent));
  const [newKnowledge, setNewKnowledge] = useState({ title: "", content: "" });
  const [selectedKnowledgeFile, setSelectedKnowledgeFile] = useState<File | null>(null);
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const currentAgent = useMemo(
    () => (agent ? agents.find((candidate) => candidate.id === agent.id) ?? agent : undefined),
    [agent, agents],
  );

  const initialAudience = useMemo(() => getAudienceFormState(agent), [agent]);
  const audienceInput = useMemo(() => buildAudienceInput(audience), [audience]);
  const normalizedTriggers = useMemo(() => normalizeTriggers(triggers), [triggers]);
  const proactiveConfig = useMemo(() => buildProactiveConfig(proactive), [proactive]);
  const audienceDirty = useMemo(
    () => audienceSnapshot(audience) !== audienceSnapshot(initialAudience),
    [audience, initialAudience],
  );
  const hasPersistedAudience = useMemo(() => hasAudienceFilters(initialAudience), [initialAudience]);
  const hasAnyAudienceFilter = useMemo(() => hasAudienceFilters(audience), [audience]);
  const selectedFilterChips = useMemo(() => {
    const chips: string[] = [];

    if (audience.profileLevel) {
      chips.push(PROFILE_LEVEL_OPTIONS.find((option) => option.value === audience.profileLevel)?.label ?? "Perfil");
    }
    if (audience.interactionLevel) {
      chips.push(
        INTERACTION_LEVEL_OPTIONS.find((option) => option.value === audience.interactionLevel)?.label ?? "Interacao",
      );
    }
    if (audience.purchaseLevel) {
      chips.push(PURCHASE_LEVEL_OPTIONS.find((option) => option.value === audience.purchaseLevel)?.label ?? "Compras");
    }
    if (audience.ageLevel) {
      chips.push(AGE_LEVEL_OPTIONS.find((option) => option.value === audience.ageLevel)?.label ?? "Tempo de cliente");
    }
    if (audience.purchaseInterestLevel) {
      chips.push(
        PURCHASE_INTEREST_OPTIONS.find((option) => option.value === audience.purchaseInterestLevel)?.label ??
          "Interesse",
      );
    }
    if (audience.state.trim()) {
      const selectedState = stateOptions.find((option) => option.code === audience.state.trim().toUpperCase());
      chips.push(`Estado: ${selectedState?.name ?? audience.state.trim().toUpperCase()}`);
    }
    if (audience.city.trim()) chips.push(`Cidade: ${audience.city.trim()}`);
    if (audience.segmentIds.length > 0) chips.push(`Segmentos: ${audience.segmentIds.length}`);
    if (audience.campaignIds.length > 0) chips.push(`Campanhas: ${audience.campaignIds.length}`);
    if (audience.operatorIds.length > 0) chips.push(`Fidelizacao: ${audience.operatorIds.length}`);

    return chips;
  }, [audience, stateOptions]);
  const availableTemplates = useMemo(() => {
    const currentTemplateName = form.templateName.trim();
    const currentTemplateLanguage = form.templateLanguage.trim();
    const options = [...templates];

    if (!currentTemplateName) {
      return options;
    }

    const exists = options.some(
      (template) =>
        template.name === currentTemplateName &&
        (!currentTemplateLanguage || template.language === currentTemplateLanguage),
    );

    if (!exists) {
      options.unshift({
        id: `saved:${currentTemplateName}:${currentTemplateLanguage || "unknown"}`,
        name: currentTemplateName,
        language: currentTemplateLanguage || "pt_BR",
        category: "Cadastrado",
        status: "UNKNOWN",
        text: "",
        source: "saved",
        raw: null,
      });
    }

    return options;
  }, [form.templateLanguage, form.templateName, templates]);
  const selectedTemplate = useMemo(() => {
    const currentTemplateName = form.templateName.trim();
    const currentTemplateLanguage = form.templateLanguage.trim();

    if (!currentTemplateName) {
      return null;
    }

    return (
      availableTemplates.find(
        (template) =>
          template.name === currentTemplateName &&
          (!currentTemplateLanguage || template.language === currentTemplateLanguage),
      ) ||
      availableTemplates.find((template) => template.name === currentTemplateName) ||
      null
    );
  }, [availableTemplates, form.templateLanguage, form.templateName]);
  const selectedTemplatePreview = useMemo(() => selectedTemplate?.text?.trim() || "", [selectedTemplate]);
  const triggerErrors = useMemo(() => {
    const errors: Partial<Record<AiAgentTriggerType, string>> = {};

    for (const trigger of normalizedTriggers) {
      if (
        trigger.type === "MESSAGE_DURING_HOURS" &&
        (!TIME_PATTERN.test(trigger.config?.startTime ?? "") ||
          !TIME_PATTERN.test(trigger.config?.endTime ?? "") ||
          !(trigger.config?.timezone ?? "").trim())
      ) {
        errors[trigger.type] = "Informe horario inicial, horario final e fuso para este gatilho.";
      }

      if (trigger.type === "RESPONSE_TIMEOUT" && !trigger.config?.timeoutMinutes) {
        errors[trigger.type] = "Informe quantos minutos sem resposta devem acionar o agente.";
      }

      if (trigger.type === "KEYWORD" && (trigger.config?.keywords?.length ?? 0) === 0) {
        errors[trigger.type] = "Adicione ao menos uma palavra-chave para este gatilho.";
      }
    }

    return errors;
  }, [normalizedTriggers]);
  const reactiveMissingTriggers = receptiveEnabled && normalizedTriggers.length === 0;
  const hasInvalidTriggerConfig = receptiveEnabled && Object.keys(triggerErrors).length > 0;
  const hasAnyModeEnabled = receptiveEnabled || proactive.enabled;
  const proactiveHasTimeError = proactive.enabled && !TIME_PATTERN.test(proactive.startTime);
  const proactiveHasBatchSizeError =
    proactive.enabled && (!Number.isInteger(proactive.batchSize) || proactive.batchSize < 1 || proactive.batchSize > 500);
  const proactiveHasCustomDaysError =
    proactive.enabled && proactive.frequency === "CUSTOM_DAYS" && proactive.daysOfWeek.length === 0;
  const proactiveNeedsTemplate = proactive.enabled && proactive.entryMessageMode === "WABA_TEMPLATE";
  const proactiveHasTemplateError = proactiveNeedsTemplate && form.templateName.trim().length === 0;
  const receptiveSummary = useMemo(() => {
    if (!receptiveEnabled) {
      return ["Desligado"];
    }

    if (normalizedTriggers.length === 0) {
      return ["Selecione gatilhos"];
    }

    return normalizedTriggers.map(
      (trigger) => ALL_TRIGGERS.find((option) => option.value === trigger.type)?.label ?? trigger.type,
    );
  }, [normalizedTriggers, receptiveEnabled]);
  const proactiveSummary = useMemo(() => {
    if (!proactive.enabled) {
      return ["Desligado"];
    }

    const frequencyLabel =
      PROACTIVE_FREQUENCY_OPTIONS.find((option) => option.value === proactive.frequency)?.label ?? proactive.frequency;
    const entryModeLabel =
      ENTRY_MESSAGE_MODE_OPTIONS.find((option) => option.value === proactive.entryMessageMode)?.label ??
      proactive.entryMessageMode;

    return [frequencyLabel, proactive.startTime, `${proactive.batchSize} contatos`, entryModeLabel];
  }, [proactive]);
  const isValid =
    form.name.trim().length > 0 &&
    form.systemPrompt.trim().length > 0 &&
    form.allowedActions.length > 0 &&
    hasAnyModeEnabled &&
    !reactiveMissingTriggers &&
    !hasInvalidTriggerConfig &&
    !proactiveHasTimeError &&
    !proactiveHasBatchSizeError &&
    !proactiveHasCustomDaysError &&
    !proactiveHasTemplateError;

  useEffect(() => {
    clearAudiencePreview();
    return () => clearAudiencePreview();
  }, [agent?.id, clearAudiencePreview]);

  useEffect(() => {
    let cancelled = false;

    const loadStates = async () => {
      setStateOptionsLoading(true);

      try {
        const states = await instancesService.getStates();
        if (!cancelled) {
          setStateOptions(states);
        }
      } catch {
        if (!cancelled) {
          setStateOptions([]);
        }
      } finally {
        if (!cancelled) {
          setStateOptionsLoading(false);
        }
      }
    };

    loadStates();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stateCode = audience.state.trim().toUpperCase();

    if (!stateCode || stateCode.length !== 2) {
      setCityOptions([]);
      setCityOptionsLoading(false);
      return;
    }

    let cancelled = false;

    const loadCities = async () => {
      setCityOptionsLoading(true);

      try {
        const cities = await instancesService.getCitiesByState(stateCode);
        if (!cancelled) {
          setCityOptions(cities);
        }
      } catch {
        if (!cancelled) {
          setCityOptions([]);
        }
      } finally {
        if (!cancelled) {
          setCityOptionsLoading(false);
        }
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [audience.state]);

  const surfaceSx = {
    borderRadius: 3,
    border: "1px solid",
    borderColor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.28 : 0.14),
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
    p: { xs: 2, md: 2.5 },
  };

  const setField = <T extends keyof FormState>(field: T, value: FormState[T]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setProactiveField = <T extends keyof ProactiveFormState>(field: T, value: ProactiveFormState[T]) => {
    setProactive((prev) => ({ ...prev, [field]: value }));
  };

  const setNumericField = (field: "temperature" | "maxTokens" | "maxTurnsPerChat") =>
    (value: string) => {
      const nextValue = Number(value);
      setField(field, Number.isFinite(nextValue) ? nextValue : 0);
    };

  const toggleAction = (action: AiAgentActionType) => {
    setForm((prev) => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(action)
        ? prev.allowedActions.filter((allowed) => allowed !== action)
        : [...prev.allowedActions, action],
    }));
  };

  const toggleTrigger = (type: AiAgentTriggerType) => {
    setTriggers((prev) =>
      prev.some((trigger) => trigger.type === type)
        ? prev.filter((trigger) => trigger.type !== type)
        : [
            ...prev,
            {
              type,
              config:
                type === "KEYWORD"
                  ? { keywords: [] }
                  : type === "MESSAGE_DURING_HOURS"
                    ? { ...DEFAULT_MESSAGE_DURING_HOURS_TRIGGER_CONFIG }
                    : {},
            },
          ],
    );
  };

  const getSelectedTrigger = (type: AiAgentTriggerType) => triggers.find((trigger) => trigger.type === type);

  const updateTriggerConfig = (type: AiAgentTriggerType, nextConfig: NonNullable<AiAgentTriggerInput["config"]>) => {
    setTriggers((prev) =>
      prev.map((trigger) =>
        trigger.type === type
          ? {
              ...trigger,
              config: nextConfig,
            }
          : trigger,
      ),
    );
  };

  const handleLookupChange = (field: "segmentIds" | "campaignIds" | "operatorIds") =>
    (_: unknown, values: CustomerLookupOption[]) => {
      setAudience((prev) => ({
        ...prev,
        [field]: values.map((value) => value.CODIGO),
      }));
    };

  const toggleCustomDay = (day: number) => {
    setProactive((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((value) => value !== day)
        : [...prev.daysOfWeek, day].sort((left, right) => left - right),
    }));
  };

  async function handleSave() {
    if (!isValid) return;

    setSaving(true);
    try {
      const payload: CreateAiAgentInput = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        enabled: form.enabled,
        systemPrompt: form.systemPrompt.trim(),
        model: form.model,
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        maxTurnsPerChat: form.maxTurnsPerChat,
        allowedActions: form.allowedActions,
        triggers: receptiveEnabled ? normalizedTriggers : [],
        proactiveConfig,
        ...(form.templateName.trim() && { templateName: form.templateName.trim() }),
        ...(form.templateName.trim() && form.templateLanguage.trim() && { templateLanguage: form.templateLanguage.trim() }),
        ...(form.escalateToWalletId && { escalateToWalletId: Number(form.escalateToWalletId) }),
        ...(form.escalateToUserId && { escalateToUserId: Number(form.escalateToUserId) }),
      };

      if (!isEdit) {
        const created = await createAgent({
          ...payload,
          ...(hasAnyAudienceFilter ? { audience: audienceInput } : {}),
        });

        if (created) onClose();
        return;
      }

      const updated = await updateAgent(agent.id, payload);
      if (!updated) return;

      if (hasPersistedAudience || hasAnyAudienceFilter) {
        const audienceSaved = await saveAgentAudience(agent.id, audienceInput, {
          showSuccessToast: false,
        });
        if (!audienceSaved) return;
      }

      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddKnowledge() {
    if (!currentAgent || !newKnowledge.title.trim() || !newKnowledge.content.trim()) return;

    setAddingKnowledge(true);
    try {
      const uploadedFile = selectedKnowledgeFile
        ? await filesService.uploadBrowserFile({
            instance,
            dirType: FileDirType.MODELS,
            file: selectedKnowledgeFile,
          })
        : null;

      const payload: AiAgentKnowledgeEntryInput = {
        title: newKnowledge.title.trim(),
        content: newKnowledge.content.trim(),
        ...(uploadedFile && {
          fileId: uploadedFile.id,
          fileName: uploadedFile.name,
          fileType: uploadedFile.mime_type,
          fileSize: uploadedFile.size,
        }),
      };

      const saved = await addKnowledgeEntry(currentAgent.id, payload);
      if (!saved) return;

      setNewKnowledge({ title: "", content: "" });
      setSelectedKnowledgeFile(null);
    } catch (error) {
      toast.error(`Falha ao adicionar conhecimento: ${sanitizeErrorMessage(error)}`);
    } finally {
      setAddingKnowledge(false);
    }
  }

  async function handlePreview(page = 1) {
    if (!agent) return;
    await previewAgentAudience(agent.id, page, PREVIEW_PAGE_SIZE);
  }

  const previewPages = audiencePreview ? Math.max(1, Math.ceil(audiencePreview.page.totalRows / PREVIEW_PAGE_SIZE)) : 1;

  return (
    <Dialog
      open
      fullWidth
      maxWidth="lg"
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          backgroundImage:
            theme.palette.mode === "dark"
              ? `linear-gradient(180deg, ${alpha(theme.palette.primary.dark, 0.18)} 0%, ${theme.palette.background.paper} 18%)`
              : `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.28)} 0%, ${theme.palette.background.paper} 18%)`,
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.16),
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.14),
                color: theme.palette.primary.main,
              }}
            >
              <SmartToyOutlinedIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {isEdit ? `Editar agente: ${agent.name}` : "Novo agente de IA"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure identidade, modo receptivo e modo ativo no mesmo cadastro do agente.
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 2.5,
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.12),
          "& .MuiTab-root": {
            minHeight: 56,
            fontWeight: 700,
            color: "text.secondary",
          },
          "& .Mui-selected": {
            color: "primary.main",
          },
        }}
      >
        <Tab label="Geral" />
        <Tab label="Atuacao" />
        <Tab label="Acoes" />
        <Tab label="Publico" />
        {isEdit && <Tab label="Conhecimento" />}
      </Tabs>

      <DialogContent sx={{ px: 3, py: 3 }}>
        {tab === 0 && (
          <Stack spacing={3}>
            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Identidade do agente
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "1.4fr auto" },
                  alignItems: "start",
                }}
              >
                <TextField
                  label="Nome *"
                  fullWidth
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                />
                <FormControlLabel
                  sx={{
                    m: 0,
                    mt: { xs: 0, md: 1 },
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                  }}
                  control={
                    <Checkbox
                      checked={form.enabled}
                      onChange={(event) => setField("enabled", event.target.checked)}
                    />
                  }
                  label="Ativo"
                />
              </Box>

              <TextField
                label="Descricao"
                fullWidth
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>

            <Box sx={surfaceSx}>
              <HelpLabel
                label="Prompt do sistema"
                required
                tooltip="Define tom, limites e objetivos do agente. Use esse campo para orientar como ele deve responder e quando escalar."
              />
              <TextField
                fullWidth
                multiline
                minRows={5}
                placeholder="Ex.: Voce atende clientes com tom cordial, objetivo e sempre confirma o contexto antes de sugerir uma acao."
                value={form.systemPrompt}
                onChange={(event) => setField("systemPrompt", event.target.value)}
                helperText="Escreva as instrucoes em texto livre. Este campo nao substitui marcadores como {NOME_CLIENTE} ou {EMPRESA}; hoje o agente recebe automaticamente o historico recente da conversa e a base de conhecimento cadastrada."
              />
            </Box>

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Configuracao do modelo
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                <Box>
                  <HelpLabel
                    label="Modelo"
                    tooltip="Escolhe o modelo usado nas respostas. Voce pode usar uma sugestao da lista ou digitar manualmente o nome exato do modelo liberado para sua conta."
                  />
                  <Autocomplete
                    freeSolo
                    options={MODEL_OPTIONS}
                    value={form.model}
                    onChange={(_, value) => setField("model", value ?? "")}
                    onInputChange={(_, value, reason) => {
                      if (reason === "input" || reason === "clear") {
                        setField("model", value);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        placeholder="Ex.: gpt-5.4"
                        helperText="Sugestoes rapidas: gpt-5.4, gpt-4o e gpt-4o-mini. Se precisar, digite outro modelo manualmente."
                      />
                    )}
                  />
                </Box>

                <Box>
                  <HelpLabel
                    label="Temperatura"
                    tooltip="Controla variacao criativa. Valores baixos deixam as respostas mais previsiveis; valores altos deixam as respostas mais livres."
                  />
                  <TextField
                    type="number"
                    fullWidth
                    value={form.temperature}
                    onChange={(event) => setNumericField("temperature")(event.target.value)}
                    inputProps={{ min: 0, max: 2, step: 0.1 }}
                  />
                </Box>

                <Box>
                  <HelpLabel
                    label="Maximo de tokens"
                    tooltip="Limita o tamanho da resposta gerada. Aumente apenas quando precisar de respostas mais longas ou estruturadas."
                  />
                  <TextField
                    type="number"
                    fullWidth
                    value={form.maxTokens}
                    onChange={(event) => setNumericField("maxTokens")(event.target.value)}
                    inputProps={{ min: 100, max: 4000 }}
                  />
                </Box>

                <Box>
                  <HelpLabel
                    label="Turnos maximos por chat"
                    tooltip="Define quantas interacoes o agente pode conduzir na mesma conversa antes de parar ou depender de outra regra."
                  />
                  <TextField
                    type="number"
                    fullWidth
                    value={form.maxTurnsPerChat}
                    onChange={(event) => setNumericField("maxTurnsPerChat")(event.target.value)}
                    inputProps={{ min: 1, max: 200 }}
                  />
                </Box>
              </Box>
            </Box>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: 3 }}>
              Um mesmo agente pode operar de forma receptiva, ativa ou hibrida. Os dois modos compartilham identidade, acoes, conhecimento e o mesmo publico salvo.
            </Alert>

            {!hasAnyModeEnabled && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                Ative ao menos um modo de atuacao para salvar o agente.
              </Alert>
            )}

            {reactiveMissingTriggers && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                O modo receptivo precisa de pelo menos um gatilho selecionado.
              </Alert>
            )}

            {hasInvalidTriggerConfig && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                Alguns gatilhos do modo receptivo ainda precisam de configuracao antes de salvar.
              </Alert>
            )}

            {proactiveHasCustomDaysError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                No modo ativo com dias customizados, selecione ao menos um dia da semana.
              </Alert>
            )}

            {proactiveHasTemplateError && (
              <Alert severity="warning" sx={{ borderRadius: 3 }}>
                O modo ativo com template exige um template configurado na aba Acoes.
              </Alert>
            )}

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Modo de atuacao
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: receptiveEnabled
                      ? alpha(theme.palette.primary.main, 0.32)
                      : alpha(theme.palette.divider, 0.78),
                    bgcolor: receptiveEnabled
                      ? alpha(theme.palette.primary.main, 0.08)
                      : alpha(theme.palette.background.default, 0.2),
                    p: 2,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>Receptivo</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Entra em conversas iniciadas pelo cliente com base em gatilhos de mensagem.
                        </Typography>
                      </Box>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                          <Checkbox
                            checked={receptiveEnabled}
                            onChange={(event) => setReceptiveEnabled(event.target.checked)}
                          />
                        }
                        label={receptiveEnabled ? "Ligado" : "Desligado"}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {receptiveSummary.map((item) => (
                        <Chip
                          key={item}
                          size="small"
                          label={item}
                          color={receptiveEnabled ? "primary" : "default"}
                          variant={receptiveEnabled ? "filled" : "outlined"}
                          sx={{ borderRadius: 999 }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Box>

                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: proactive.enabled
                      ? alpha(theme.palette.secondary.main, 0.32)
                      : alpha(theme.palette.divider, 0.78),
                    bgcolor: proactive.enabled
                      ? alpha(theme.palette.secondary.main, 0.08)
                      : alpha(theme.palette.background.default, 0.2),
                    p: 2,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>Ativo</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Agenda rodadas recorrentes para iniciar conversas de forma automatica.
                        </Typography>
                      </Box>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                          <Checkbox
                            checked={proactive.enabled}
                            onChange={(event) => setProactiveField("enabled", event.target.checked)}
                          />
                        }
                        label={proactive.enabled ? "Ligado" : "Desligado"}
                      />
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {proactiveSummary.map((item) => (
                        <Chip
                          key={item}
                          size="small"
                          label={item}
                          color={proactive.enabled ? "secondary" : "default"}
                          variant={proactive.enabled ? "filled" : "outlined"}
                          sx={{ borderRadius: 999 }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            </Box>

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Receptivo: gatilhos de entrada
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Escolha em quais eventos de mensagem o agente pode assumir a conversa quando o modo receptivo estiver ligado.
              </Typography>

              {!receptiveEnabled && (
                <Alert severity="info" sx={{ borderRadius: 3, mb: 2 }}>
                  Ative o modo receptivo acima para configurar os gatilhos que tornam o agente elegivel em conversas recebidas.
                </Alert>
              )}

              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                {ALL_TRIGGERS.map((trigger) => {
                  const selected = triggers.some((item) => item.type === trigger.value);
                  const selectedTrigger = getSelectedTrigger(trigger.value);
                  const config = selectedTrigger ? getTriggerConfig(selectedTrigger) : {};
                  const triggerError = triggerErrors[trigger.value];
                  return (
                    <Box
                      key={trigger.value}
                      sx={{
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: selected
                          ? alpha(theme.palette.primary.main, 0.38)
                          : alpha(theme.palette.divider, 0.8),
                        bgcolor: selected
                          ? alpha(theme.palette.primary.main, 0.08)
                          : alpha(theme.palette.background.default, 0.2),
                        opacity: receptiveEnabled ? 1 : 0.6,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <FormControlLabel
                        sx={{ m: 0, alignItems: "flex-start" }}
                        control={
                          <Checkbox
                            checked={selected}
                            disabled={!receptiveEnabled}
                            onChange={() => toggleTrigger(trigger.value)}
                          />
                        }
                        label={
                          <Box sx={{ pt: 0.6 }}>
                            <Typography sx={{ fontWeight: 700 }}>{trigger.label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {trigger.description}
                            </Typography>

                            {selected && trigger.value === "RESPONSE_TIMEOUT" && (
                              <Box sx={{ mt: 1.5, maxWidth: 280 }}>
                                <TextField
                                  label="Minutos sem resposta"
                                  type="number"
                                  fullWidth
                                  disabled={!receptiveEnabled}
                                  value={config.timeoutMinutes ?? ""}
                                  onChange={(event) => {
                                    const rawValue = event.target.value.trim();

                                    updateTriggerConfig(trigger.value, {
                                      timeoutMinutes:
                                        rawValue.length === 0 ? undefined : Math.max(1, Number(rawValue) || 0),
                                    });
                                  }}
                                  inputProps={{ min: 1 }}
                                  error={!!triggerError}
                                  helperText={triggerError ?? "Depois desse intervalo sem retorno, o agente pode assumir a conversa."}
                                  onClick={(event) => event.stopPropagation()}
                                />
                              </Box>
                            )}

                            {selected && trigger.value === "KEYWORD" && (
                              <Box sx={{ mt: 1.5, maxWidth: 420 }}>
                                <Autocomplete
                                  multiple
                                  freeSolo
                                  options={[]}
                                  value={config.keywords ?? []}
                                  onChange={(_, value) => {
                                    updateTriggerConfig(trigger.value, {
                                      keywords: value.map((keyword) => String(keyword).trim()).filter(Boolean),
                                    });
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Palavras-chave"
                                      disabled={!receptiveEnabled}
                                      error={!!triggerError}
                                      helperText={triggerError ?? "Digite e pressione Enter para adicionar cada palavra ou frase acionadora."}
                                      onClick={(event) => event.stopPropagation()}
                                    />
                                  )}
                                />
                              </Box>
                            )}

                            {selected && trigger.value === "MESSAGE_DURING_HOURS" && (
                              <Stack sx={{ mt: 1.5, maxWidth: 420 }} spacing={1.5}>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                                  <TextField
                                    label="Inicio"
                                    placeholder="09:00"
                                    fullWidth
                                    disabled={!receptiveEnabled}
                                    value={String(config.startTime ?? "")}
                                    onChange={(event) => {
                                      updateTriggerConfig(trigger.value, {
                                        ...config,
                                        startTime: event.target.value.trim(),
                                      });
                                    }}
                                    error={!!triggerError}
                                    helperText={triggerError ?? "Use HH:MM para o inicio da janela."}
                                    onClick={(event) => event.stopPropagation()}
                                  />

                                  <TextField
                                    label="Fim"
                                    placeholder="18:00"
                                    fullWidth
                                    disabled={!receptiveEnabled}
                                    value={String(config.endTime ?? "")}
                                    onChange={(event) => {
                                      updateTriggerConfig(trigger.value, {
                                        ...config,
                                        endTime: event.target.value.trim(),
                                      });
                                    }}
                                    error={!!triggerError}
                                    helperText={triggerError ?? "Pode cruzar meia-noite, por exemplo 22:00 ate 06:00."}
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                </Stack>

                                <TextField
                                  select
                                  label="Fuso horario"
                                  fullWidth
                                  disabled={!receptiveEnabled}
                                  value={String(config.timezone ?? DEFAULT_MESSAGE_DURING_HOURS_TRIGGER_CONFIG.timezone)}
                                  onChange={(event) => {
                                    updateTriggerConfig(trigger.value, {
                                      ...config,
                                      timezone: event.target.value,
                                    });
                                  }}
                                  error={!!triggerError}
                                  helperText={triggerError ?? "A mensagem so aciona o agente se chegar dentro dessa janela no fuso escolhido."}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {TIMEZONE_OPTIONS.map((timezone) => (
                                    <MenuItem key={timezone} value={timezone}>
                                      {timezone}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Stack>
                            )}

                            {selected && trigger.value === "ALWAYS" && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                                Este gatilho nao exige configuracao adicional.
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Ativo: agenda recorrente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                O modo ativo usa o mesmo publico salvo para abrir conversas novas em lotes recorrentes, sem depender de mensagem recebida.
              </Typography>

              {!proactive.enabled && (
                <Alert severity="info" sx={{ borderRadius: 3, mb: 2 }}>
                  Ative o modo ativo acima para definir frequencia, horario, lote e a forma de primeiro contato.
                </Alert>
              )}

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  opacity: proactive.enabled ? 1 : 0.68,
                }}
              >
                <TextField
                  label="Frequencia"
                  select
                  fullWidth
                  disabled={!proactive.enabled}
                  value={proactive.frequency}
                  onChange={(event) =>
                    setProactive((prev) => ({
                      ...prev,
                      frequency: event.target.value as AiAgentProactiveFrequency,
                      daysOfWeek:
                        event.target.value === "CUSTOM_DAYS"
                          ? prev.daysOfWeek.length > 0
                            ? prev.daysOfWeek
                            : [1]
                          : [],
                    }))
                  }
                  helperText={
                    PROACTIVE_FREQUENCY_OPTIONS.find((option) => option.value === proactive.frequency)?.description
                  }
                >
                  {PROACTIVE_FREQUENCY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Horario de inicio"
                  type="time"
                  fullWidth
                  disabled={!proactive.enabled}
                  value={proactive.startTime}
                  onChange={(event) => setProactiveField("startTime", event.target.value)}
                  error={proactiveHasTimeError}
                  helperText={proactiveHasTimeError ? "Use um horario valido no formato HH:MM." : "Horario base da rodada automatica."}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 60 }}
                />

                <Autocomplete
                  freeSolo
                  options={TIMEZONE_OPTIONS}
                  value={proactive.timezone}
                  disabled={!proactive.enabled}
                  onChange={(_, value) => setProactiveField("timezone", value ?? DEFAULT_PROACTIVE_FORM.timezone)}
                  onInputChange={(_, value, reason) => {
                    if (reason === "input" || reason === "clear") {
                      setProactiveField("timezone", value);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Timezone"
                      helperText="Pode usar uma sugestao ou digitar outra timezone IANA valida."
                    />
                  )}
                />

                <TextField
                  label="Tamanho do lote"
                  type="number"
                  fullWidth
                  disabled={!proactive.enabled}
                  value={proactive.batchSize}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setProactiveField("batchSize", Number.isFinite(nextValue) ? nextValue : 0);
                  }}
                  inputProps={{ min: 1, max: 500 }}
                  error={proactiveHasBatchSizeError}
                  helperText={proactiveHasBatchSizeError ? "Informe um lote entre 1 e 500 contatos." : "Quantidade maxima de contatos por rodada."}
                />

                <TextField
                  label="Primeira mensagem"
                  select
                  fullWidth
                  disabled={!proactive.enabled}
                  value={proactive.entryMessageMode}
                  onChange={(event) =>
                    setProactiveField("entryMessageMode", event.target.value as AiAgentProactiveEntryMessageMode)
                  }
                  helperText={
                    ENTRY_MESSAGE_MODE_OPTIONS.find((option) => option.value === proactive.entryMessageMode)?.description
                  }
                >
                  {ENTRY_MESSAGE_MODE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {proactive.enabled && proactive.frequency === "CUSTOM_DAYS" && (
                <Box sx={{ mt: 2.5 }}>
                  <HelpLabel
                    label="Dias da semana"
                    required
                    tooltip="Esses dias sao usados apenas quando a frequencia esta como dias customizados."
                  />
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const selected = proactive.daysOfWeek.includes(day.value);

                      return (
                        <Chip
                          key={day.value}
                          clickable={proactive.enabled}
                          color={selected ? "secondary" : "default"}
                          variant={selected ? "filled" : "outlined"}
                          label={day.label}
                          onClick={() => proactive.enabled && toggleCustomDay(day.value)}
                          sx={{ borderRadius: 999 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}

              <FormControlLabel
                sx={{ mt: 2 }}
                control={
                  <Checkbox
                    checked={proactive.skipContactsWithOpenChat}
                    disabled={!proactive.enabled}
                    onChange={(event) => setProactiveField("skipContactsWithOpenChat", event.target.checked)}
                  />
                }
                label="Pular contatos que ja tenham chat aberto"
              />

              {proactiveNeedsTemplate && (
                <Alert severity="info" sx={{ borderRadius: 3, mt: 2 }}>
                  Como a abertura ativa esta em modo template, selecione o template na aba Acoes.
                </Alert>
              )}
            </Box>
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={3}>
            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Permissoes do agente
              </Typography>
              <FormGroup>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  }}
                >
                  {ALL_ACTIONS.map((action) => {
                    const selected = form.allowedActions.includes(action.value);
                    return (
                      <Box
                        key={action.value}
                        sx={{
                          borderRadius: 2.5,
                          border: "1px solid",
                          borderColor: selected
                            ? alpha(theme.palette.secondary.main, 0.38)
                            : alpha(theme.palette.divider, 0.8),
                          bgcolor: selected
                            ? alpha(theme.palette.secondary.main, 0.08)
                            : alpha(theme.palette.background.default, 0.2),
                          px: 1.5,
                          py: 1,
                        }}
                      >
                        <FormControlLabel
                          sx={{ m: 0, alignItems: "flex-start" }}
                          control={
                            <Checkbox
                              checked={selected}
                              onChange={() => toggleAction(action.value)}
                            />
                          }
                          label={
                            <Box sx={{ pt: 0.6 }}>
                              <Typography sx={{ fontWeight: 700 }}>{action.label}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {action.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    );
                  })}
                </Box>
              </FormGroup>
            </Box>

            {(form.allowedActions.includes("SEND_TEMPLATE") || proactiveNeedsTemplate) && (
              <Box sx={surfaceSx}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                  Configuracao de template WABA
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Este template pode ser reutilizado tanto nas acoes do agente quanto como primeira mensagem do modo ativo.
                </Typography>
                <Box>
                  <Autocomplete
                    options={availableTemplates}
                    value={selectedTemplate}
                    onChange={(_, option) => {
                      setField("templateName", option?.name ?? "");
                      setField("templateLanguage", option?.language ?? "");
                    }}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => getTemplateIdentity(option) === getTemplateIdentity(value)}
                    noOptionsText="Nenhum template disponível"
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;

                      return (
                        <li key={key} {...rest}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {option.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.category} • {option.language} • {option.status}
                            </Typography>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Template"
                        fullWidth
                        required={proactiveNeedsTemplate}
                        error={proactiveHasTemplateError}
                        helperText={
                          proactiveHasTemplateError
                            ? "Selecione um template existente para o modo ativo."
                            : availableTemplates.length === 0
                              ? "Nenhum template foi carregado para a sessão atual do WhatsApp."
                              : "Pesquise e selecione um dos templates existentes da operação."
                        }
                      />
                    )}
                  />
                </Box>

                {selectedTemplate && selectedTemplatePreview && (
                  <Box
                    sx={{
                      mt: 2,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: alpha(theme.palette.secondary.main, 0.16),
                      bgcolor: alpha(theme.palette.secondary.main, 0.05),
                      px: 1.5,
                      py: 1.25,
                    }}
                  >
                    <Typography variant="caption" sx={{ display: "block", fontWeight: 800, mb: 1, color: "text.secondary" }}>
                      Prévia do template {selectedTemplate.language ? `• ${selectedTemplate.language}` : ""}
                    </Typography>
                    {selectedTemplatePreview.split("\n").map((line, index) => (
                      <Typography key={`${selectedTemplate.id}-${index}`} variant="body2" color="text.secondary">
                        {line}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {form.allowedActions.includes("ESCALATE") && (
              <Box sx={surfaceSx}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                  Destino de escalonamento
                </Typography>
                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                  <TextField
                    label="Carteira de destino (ID)"
                    type="number"
                    fullWidth
                    value={form.escalateToWalletId}
                    onChange={(event) => setField("escalateToWalletId", event.target.value)}
                  />
                  <TextField
                    label="Operador de destino (ID)"
                    type="number"
                    fullWidth
                    value={form.escalateToUserId}
                    onChange={(event) => setField("escalateToUserId", event.target.value)}
                  />
                </Box>
              </Box>
            )}
          </Stack>
        )}

        {tab === 3 && (
          <Stack spacing={3}>
            <Box sx={surfaceSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Escopo de atendimento
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  O mesmo publico salvo aqui vale para o modo receptivo e para o modo ativo. Sem filtros, o agente considera toda a base elegivel.
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {selectedFilterChips.length > 0 ? (
                    selectedFilterChips.map((chip) => (
                      <Chip
                        key={chip}
                        label={chip}
                        color="primary"
                        variant="outlined"
                        sx={{ borderRadius: 999 }}
                      />
                    ))
                  ) : (
                    <Chip label="Sem filtros aplicados" variant="outlined" sx={{ borderRadius: 999 }} />
                  )}
                </Stack>
              </Stack>
            </Box>

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Tags automaticas de perfil
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                <TextField
                  label="Perfil do cliente"
                  select
                  fullWidth
                  value={audience.profileLevel}
                  onChange={(event) => setAudience((prev) => ({ ...prev, profileLevel: event.target.value as CustomerProfileSummaryLevel | "" }))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {PROFILE_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Nivel de interacao"
                  select
                  fullWidth
                  value={audience.interactionLevel}
                  onChange={(event) =>
                    setAudience((prev) => ({ ...prev, interactionLevel: event.target.value as CustomerInteractionLevel | "" }))
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {INTERACTION_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Nivel de compras"
                  select
                  fullWidth
                  value={audience.purchaseLevel}
                  onChange={(event) =>
                    setAudience((prev) => ({ ...prev, purchaseLevel: event.target.value as CustomerPurchaseLevel | "" }))
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {PURCHASE_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Tempo de cliente"
                  select
                  fullWidth
                  value={audience.ageLevel}
                  onChange={(event) => setAudience((prev) => ({ ...prev, ageLevel: event.target.value as CustomerAgeLevel | "" }))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {AGE_LEVEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Interesse de compra"
                  select
                  fullWidth
                  value={audience.purchaseInterestLevel}
                  onChange={(event) =>
                    setAudience((prev) => ({
                      ...prev,
                      purchaseInterestLevel: event.target.value as CustomerPurchaseInterestLevel | "",
                    }))
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {PURCHASE_INTEREST_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Filtros de CRM
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                <Autocomplete
                  options={stateOptions}
                  loading={stateOptionsLoading}
                  value={stateOptions.find((option) => option.code === audience.state) ?? null}
                  onChange={(_, value) =>
                    setAudience((prev) => ({
                      ...prev,
                      state: value?.code ?? "",
                      city: "",
                    }))
                  }
                  isOptionEqualToValue={(option, value) => option.code === value.code}
                  getOptionLabel={(option) => `${option.name} (${option.code})`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Estado"
                      helperText="Selecione o estado a partir da base geografica do sistema."
                    />
                  )}
                />

                <Autocomplete
                  freeSolo
                  options={cityOptions}
                  loading={cityOptionsLoading}
                  value={audience.city}
                  onChange={(_, value) =>
                    setAudience((prev) => ({
                      ...prev,
                      city: typeof value === "string" ? value : "",
                    }))
                  }
                  onInputChange={(_, value, reason) => {
                    if (reason === "input" || reason === "clear") {
                      setAudience((prev) => ({ ...prev, city: value }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cidade"
                      helperText={
                        audience.state
                          ? "Use as cidades sugeridas para o estado selecionado."
                          : "Selecione um estado para carregar a lista de cidades sugeridas."
                      }
                    />
                  )}
                />
              </Box>

              <Stack spacing={2} sx={{ mt: 2 }}>
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={segmentOptions}
                  value={segmentOptions.filter((option) => audience.segmentIds.includes(option.CODIGO))}
                  onChange={handleLookupChange("segmentIds")}
                  loading={lookupsLoading}
                  getOptionLabel={getLookupLabel}
                  isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props;
                    return (
                      <li key={key} {...rest}>
                        <Checkbox icon={EMPTY_ICON} checkedIcon={CHECKED_ICON} checked={selected} sx={{ mr: 1 }} />
                        {getLookupLabel(option)}
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Segmentos"
                      helperText="Selecione os segmentos de CRM que o agente pode atender."
                    />
                  )}
                />

                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={campaignOptions}
                  value={campaignOptions.filter((option) => audience.campaignIds.includes(option.CODIGO))}
                  onChange={handleLookupChange("campaignIds")}
                  loading={lookupsLoading}
                  getOptionLabel={getLookupLabel}
                  isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props;
                    return (
                      <li key={key} {...rest}>
                        <Checkbox icon={EMPTY_ICON} checkedIcon={CHECKED_ICON} checked={selected} sx={{ mr: 1 }} />
                        {getLookupLabel(option)}
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Campanhas / carteiras"
                      helperText="Usa as campanhas do CRM para restringir em quais carteiras comerciais o agente atua."
                    />
                  )}
                />

                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={operatorOptions}
                  value={operatorOptions.filter((option) => audience.operatorIds.includes(option.CODIGO))}
                  onChange={handleLookupChange("operatorIds")}
                  loading={lookupsLoading}
                  getOptionLabel={getLookupLabel}
                  isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
                  renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props;
                    return (
                      <li key={key} {...rest}>
                        <Checkbox icon={EMPTY_ICON} checkedIcon={CHECKED_ICON} checked={selected} sx={{ mr: 1 }} />
                        {getLookupLabel(option)}
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Fidelizacao"
                      helperText="Selecione os usuarios responsaveis pela fidelizacao que este agente pode atender."
                    />
                  )}
                />
              </Stack>
            </Box>

            <Box sx={surfaceSx}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={1.5}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Previa do publico
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gere a lista de contatos elegiveis sob demanda. O preview representa o publico compartilhado pelos dois modos de atuacao.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={audiencePreviewLoading ? <CircularProgress size={16} color="inherit" /> : <Groups2Icon />}
                    onClick={() => handlePreview(1)}
                    disabled={!isEdit || audiencePreviewLoading}
                  >
                    {audiencePreviewLoading ? "Gerando previa..." : "Gerar previa"}
                  </Button>
                </Stack>

                {!isEdit && (
                  <Alert severity="info" sx={{ borderRadius: 3 }}>
                    Salve o agente primeiro para habilitar a previa do publico.
                  </Alert>
                )}

                {isEdit && audienceDirty && (
                  <Alert severity="warning" sx={{ borderRadius: 3 }}>
                    A previa considera o publico salvo por ultimo. Salve o agente para refletir alteracoes recentes nesta aba.
                  </Alert>
                )}

                {audiencePreview && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {audiencePreview.page.totalRows} contato(s) elegivel(is).
                    </Typography>

                    {audiencePreview.data.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        Nenhum contato encontrado para os filtros atuais salvos.
                      </Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {audiencePreview.data.map((contact) => (
                          <Box
                            key={contact.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              borderRadius: 2.5,
                              border: "1px solid",
                              borderColor: alpha(theme.palette.primary.main, 0.12),
                              bgcolor: alpha(theme.palette.primary.main, 0.03),
                              px: 1.5,
                              py: 1.25,
                            }}
                          >
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
                              {(contact.name || "?").charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700 }} noWrap>
                                {contact.name || contact.phone}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {contact.phone}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {getCustomerLabel(contact)}
                              </Typography>
                            </Box>
                            {contact.customerId && (
                              <Chip
                                size="small"
                                label={`CRM ${contact.customerId}`}
                                variant="outlined"
                                sx={{ borderRadius: 999 }}
                              />
                            )}
                          </Box>
                        ))}
                      </Stack>
                    )}

                    {previewPages > 1 && (
                      <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                        <Pagination
                          count={previewPages}
                          page={audiencePreview.page.current}
                          onChange={(_, page) => handlePreview(page)}
                          color="primary"
                          disabled={audiencePreviewLoading}
                        />
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        )}

        {tab === knowledgeTabIndex && isEdit && (
          <Stack spacing={3}>
            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Base de conhecimento
              </Typography>
              {(currentAgent?.knowledgeEntries.length ?? 0) === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma entrada de conhecimento cadastrada.
                </Typography>
              )}
              <Stack spacing={1.5}>
                {currentAgent?.knowledgeEntries.map((entry) => (
                  <Box
                    key={entry.id}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: alpha(theme.palette.primary.main, 0.12),
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      px: 1.5,
                      py: 1.25,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{entry.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                        {entry.content}
                      </Typography>

                      {entry.fileId && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.25 }} useFlexGap flexWrap="wrap">
                          <Chip
                            size="small"
                            color="secondary"
                            variant="outlined"
                            label={entry.fileName ? `Anexo: ${entry.fileName}` : `Anexo #${entry.fileId}`}
                            sx={{ borderRadius: 999, maxWidth: "100%" }}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={entry.fileType ?? "Tipo não informado"}
                            sx={{ borderRadius: 999 }}
                          />
                          {entry.fileSize !== null && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${entry.fileSize} bytes`}
                              sx={{ borderRadius: 999 }}
                            />
                          )}
                          <Button
                            size="small"
                            variant="text"
                            component="a"
                            href={filesService.getFileDownloadUrl(entry.fileId)}
                            target="_blank"
                            rel="noreferrer"
                            sx={{ alignSelf: "flex-start" }}
                          >
                            Abrir anexo
                          </Button>
                        </Stack>
                      )}
                    </Box>
                    <Tooltip title="Remover entrada">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteKnowledgeEntry(currentAgent.id, entry.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box sx={surfaceSx}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Adicionar entrada
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Titulo"
                  fullWidth
                  value={newKnowledge.title}
                  onChange={(event) => setNewKnowledge((prev) => ({ ...prev, title: event.target.value }))}
                />
                <TextField
                  label="Conteudo"
                  fullWidth
                  multiline
                  minRows={4}
                  value={newKnowledge.content}
                  onChange={(event) => setNewKnowledge((prev) => ({ ...prev, content: event.target.value }))}
                  helperText="Explique para a IA o que existe neste conhecimento e em que contexto ele deve ser usado."
                />
                <FilePicker selectedFile={selectedKnowledgeFile} onChangeFile={setSelectedKnowledgeFile} />
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddKnowledge}
                  disabled={addingKnowledge || !newKnowledge.title.trim() || !newKnowledge.content.trim()}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {addingKnowledge ? "Adicionando..." : "Adicionar conhecimento"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>

      {tab !== knowledgeTabIndex && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 2,
            borderTop: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.12),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {tab === 1
              ? "Ative ao menos um modo. Receptivo depende de gatilhos; ativo depende da agenda recorrente configurada."
              : tab === 3
                ? "O publico salvo aqui e reutilizado tanto no modo receptivo quanto no ativo."
                : "Campos obrigatorios: nome, prompt do sistema, ao menos uma acao permitida e um modo de atuacao ativo."}
          </Typography>

          <Stack direction="row" spacing={1.5}>
            <Button onClick={onClose} color="inherit">
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving || !isValid}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </Stack>
        </Box>
      )}
    </Dialog>
  );
}
