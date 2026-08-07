"use client";

import { useAuthContext } from "@/app/auth-context";
import customersService from "@/lib/services/customers.service";
import marketingService, {
	CampaignDispatchRow,
	MarketingCampaign,
	MonitoringSummary,
} from "@/lib/services/marketing.service";
import {
	AttachFile,
	Cancel,
	EmojiEmotions,
	FilterAlt,
	PeopleAlt,
	Search,
	Send,
	Visibility,
} from "@mui/icons-material";
import {
	Alert,
	Autocomplete,
	Button,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
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
import type {
	CustomerAgeLevel,
	CustomerInteractionLevel,
	CustomerProfileSummaryLevel,
	CustomerPurchaseInterestLevel,
	CustomerPurchaseLevel,
} from "@/lib/types/customer-profile-summary";
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

type ContactRow = {
	id: number;
	name: string;
	phone: string;
	customerId: number | null;
	customerName: string | null;
	customerCampaignId: number | null;
	customerCampaignName: string | null;
	isBlocked: boolean;
	conversationExpiration: string | null;
	profileLabel: string | null;
	purchaseInterestLabel: string | null;
	interactionTagLabel: string | null;
	purchaseTagLabel: string | null;
	ageTagLabel: string | null;
};

type SummaryFilterValue<T extends string> = T | "all";

type ContactFilters = {
	search: string;
	page: number;
	perPage: number;
	profileLevel: SummaryFilterValue<CustomerProfileSummaryLevel>;
	interactionLevel: SummaryFilterValue<CustomerInteractionLevel>;
	purchaseLevel: SummaryFilterValue<CustomerPurchaseLevel>;
	ageLevel: SummaryFilterValue<CustomerAgeLevel>;
	purchaseInterestLevel: SummaryFilterValue<CustomerPurchaseInterestLevel>;
	campaignIds: string[];
};

type TemplateVariableMap = Record<string, string>;

const PROFILE_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerProfileSummaryLevel>; label: string }> = [
	{ value: "all", label: "Todos os perfis" },
	{ value: "potencial_de_compra", label: "Potencial de compra" },
	{ value: "consolidado", label: "Consolidado" },
	{ value: "precisa_mais_interacao", label: "Precisa mais interação" },
	{ value: "em_observacao", label: "Em observação" },
];

const INTERACTION_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerInteractionLevel>; label: string }> = [
	{ value: "all", label: "Toda interação" },
	{ value: "sem_interacao", label: "Sem interação" },
	{ value: "pouca_interacao", label: "Pouca interação" },
	{ value: "interacao_media", label: "Interação média" },
	{ value: "interacao_alta", label: "Interação alta" },
];

const PURCHASE_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerPurchaseLevel>; label: string }> = [
	{ value: "all", label: "Toda compra" },
	{ value: "sem_compras", label: "Sem compras" },
	{ value: "poucas_compras", label: "Poucas compras" },
	{ value: "compras_medias", label: "Compras médias" },
	{ value: "muitas_compras", label: "Muitas compras" },
];

const AGE_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerAgeLevel>; label: string }> = [
	{ value: "all", label: "Toda idade" },
	{ value: "sem_data_cadastro", label: "Sem data cadastro" },
	{ value: "cliente_novo", label: "Cliente novo" },
	{ value: "ate_6_meses", label: "Até 6 meses" },
	{ value: "ate_12_meses", label: "Até 12 meses" },
	{ value: "mais_de_12_meses", label: "Mais de 12 meses" },
];

const PURCHASE_INTEREST_FILTER_OPTIONS: Array<{ value: SummaryFilterValue<CustomerPurchaseInterestLevel>; label: string }> = [
	{ value: "all", label: "Todo interesse" },
	{ value: "nao_analisado", label: "Não analisado" },
	{ value: "baixo_interesse", label: "Baixo interesse" },
	{ value: "interesse_moderado", label: "Interesse moderado" },
	{ value: "alto_interesse", label: "Alto interesse" },
	{ value: "pronto_para_compra", label: "Pronto para compra" },
];

const emptySummary: MonitoringSummary = {
	audience: { totalSnapshots: 0, eligibleSnapshots: 0 },
	dispatches: {
		PENDING: 0,
		PROCESSING: 0,
		SENT: 0,
		DELIVERED: 0,
		READ: 0,
		FAILED: 0,
		CANCELLED: 0,
		OPTED_OUT: 0,
	},
	lastAttempt: null,
};

const demoCampaigns: MarketingCampaign[] = [
	{
		id: 501,
		name: "Disparo - Campanha #33",
		campaignDefinitionId: 33,
		campaignDefinitionName: "Recuperacao de clientes inativos",
		description: "Oferta limitada com atendimento dedicado",
		status: "RUNNING",
		createdBy: 14,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		launchedAt: new Date().toISOString(),
		scheduleRule: { startAt: new Date().toISOString(), endAt: null, sendMode: "ONE_TIME" },
	},
	{
		id: 502,
		name: "Disparo - Campanha #48",
		campaignDefinitionId: 48,
		campaignDefinitionName: "Lembrete de reposicao premium",
		description: "Campanha segmentada por historico de compra",
		status: "READY",
		createdBy: 7,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		launchedAt: null,
		scheduleRule: {
			startAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
			endAt: null,
			sendMode: "ONE_TIME",
		},
	},
];

const demoDispatchRows: CampaignDispatchRow[] = Array.from({ length: 8 }).map((_, index) => ({
	id: 1000 + index,
	status: index % 5 === 0 ? "FAILED" : index % 4 === 0 ? "READ" : "DELIVERED",
	updatedAt: new Date().toISOString(),
	lastError: index % 5 === 0 ? "Falha simulada de entrega" : null,
	audienceSnapshot: {
		contactName: `Contato Demo ${index + 1}`,
		phoneE164: `+55119888${String(index + 1).padStart(4, "0")}`,
		customerName: `Cliente ${index + 1}`,
	},
}));

const demoSummaryByCampaign: Record<number, MonitoringSummary> = {
	501: {
		...emptySummary,
		audience: { totalSnapshots: 128, eligibleSnapshots: 124 },
		dispatches: {
			PENDING: 22,
			PROCESSING: 11,
			SENT: 41,
			DELIVERED: 30,
			READ: 16,
			FAILED: 6,
			CANCELLED: 0,
			OPTED_OUT: 2,
		},
		lastAttempt: {
			startedAt: new Date().toISOString(),
			finishedAt: new Date().toISOString(),
			outcome: "SUCCESS",
		},
	},
	502: {
		...emptySummary,
		audience: { totalSnapshots: 92, eligibleSnapshots: 88 },
		dispatches: {
			PENDING: 88,
			PROCESSING: 0,
			SENT: 0,
			DELIVERED: 0,
			READ: 0,
			FAILED: 0,
			CANCELLED: 0,
			OPTED_OUT: 0,
		},
		lastAttempt: null,
	},
};

const demoContacts: ContactRow[] = Array.from({ length: 36 }).map((_, index) => ({
	id: 2000 + index,
	name: `Contato Selecionavel ${index + 1}`,
	phone: `+55119977${String(index + 1).padStart(4, "0")}`,
	customerId: index % 3 === 0 ? null : 3000 + index,
	customerName: index % 3 === 0 ? null : `Cliente ${index + 1}`,
	customerCampaignId: index % 3 === 0 ? null : index % 2 === 0 ? 33 : 48,
	customerCampaignName: index % 3 === 0 ? null : index % 2 === 0 ? "Recuperacao de clientes inativos" : "Lembrete de reposicao premium",
	isBlocked: index % 9 === 0,
	conversationExpiration: index % 4 === 0 ? null : new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
	profileLabel: index % 3 === 0 ? null : index % 2 === 0 ? "Consolidado" : "Potencial de compra",
	purchaseInterestLabel: index % 3 === 0 ? null : index % 2 === 0 ? "Interesse moderado" : "Alto interesse",
	interactionTagLabel: index % 3 === 0 ? null : index % 2 === 0 ? "Interação média" : "Interação alta",
	purchaseTagLabel: index % 3 === 0 ? null : index % 2 === 0 ? "Compras médias" : "Muitas compras",
	ageTagLabel: index % 3 === 0 ? null : index % 2 === 0 ? "Até 12 meses" : "Mais de 12 meses",
}));

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
	const byStatus: Record<string, "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning"> = {
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
				? (template.raw as { components?: Array<{ type?: string; example?: { body_text?: string[][] } }> }).components?.find(
					(component) => component.type === "BODY",
				)
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
	const { token, user } = useAuthContext();
	const { channels, templates, wppApi } = useContext(WhatsappContext);
	const [filters, setFilters] = useState<ListFilters>({ campaignId: "", status: "", senderClientId: "", sendMode: "", page: 0, perPage: 10 });
	const [loading, setLoading] = useState(true);
	const [isFallbackData, setIsFallbackData] = useState(false);
	const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
	const [campaignFilterOptions, setCampaignFilterOptions] = useState<Array<{ id: number; name: string }>>([]);
	const [crmCampaignOptions, setCrmCampaignOptions] = useState<Array<{ id: number; name: string }>>([]);
	const [totalRows, setTotalRows] = useState(0);
	const [summaryMap, setSummaryMap] = useState<Record<number, RowSummary>>({});
	const [createOpen, setCreateOpen] = useState(false);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
	const [selectedDispatches, setSelectedDispatches] = useState<CampaignDispatchRow[]>([]);
	const [detailsLoading, setDetailsLoading] = useState(false);
	const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
	const [contacts, setContacts] = useState<ContactRow[]>([]);
	const [contactsLoading, setContactsLoading] = useState(false);
	const [contactsTotal, setContactsTotal] = useState(0);
	const [contactFilters, setContactFilters] = useState<ContactFilters>({
		search: "",
		page: 0,
		perPage: 8,
		profileLevel: "all",
		interactionLevel: "all",
		purchaseLevel: "all",
		ageLevel: "all",
		purchaseInterestLevel: "all",
		campaignIds: [],
	});
	const [emojiAnchor, setEmojiAnchor] = useState<HTMLButtonElement | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [draft, setDraft] = useState<DraftForm>({
		name: "",
		description: "",
		messageBody: "",
		senderClientId: "1",
		contentMode: "text",
		templateName: "",
		scheduleMode: "ONE_TIME",
		startDate: dayjs().format("YYYY-MM-DD"),
		weekdays: ["1", "2", "3", "4", "5"],
		frequencyDays: "1",
		dayPeriodStart: "09:00",
		dayPeriodEnd: "12:00",
	});

	const canShowEmpty = !loading && campaigns.length === 0;
	const availableChannels = channels.length
		? channels
		: [
			{ id: 1, name: "WhatsApp Principal", type: "WABA" as const },
			{ id: 2, name: "WhatsApp Comercial", type: "WABA" as const },
		];
	const availableTemplates = templates.length
		? templates
		: [
			{ id: "promo-1", name: "Oferta relampago", language: "pt_BR", category: "MARKETING", status: "APPROVED", text: "Template demo", source: "demo", raw: null },
			{ id: "reposicao-2", name: "Reposicao de compra", language: "pt_BR", category: "UTILITY", status: "APPROVED", text: "Template demo", source: "demo", raw: null },
		];
	const selectedTemplate = useMemo(
		() => availableTemplates.find((template) => template.name === draft.templateName) || null,
		[availableTemplates, draft.templateName],
	);
	const templateVariables = useMemo<TemplateVariableMap>(
		() => ({
			atendente_nome: user?.NOME || "atendente",
			atendente_nome_exibição: (user as { NOME_EXIBICAO?: string | null } | null)?.NOME_EXIBICAO || "vendedor",
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
			setCampaignFilterOptions(demoCampaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })));
		}
	};

	const loadCrmCampaignOptions = async () => {
		if (!token) {
			return;
		}

		try {
			customersService.setAuth(token.startsWith("Bearer ") ? token : `Bearer ${token}`);
			const crmCampaigns = await customersService.getCampaigns();
			setCrmCampaignOptions(
				crmCampaigns
					.filter((campaign) => typeof campaign.CODIGO === "number")
					.map((campaign) => ({
						id: campaign.CODIGO,
						name: campaign.NOME || `Campanha #${campaign.CODIGO}`,
					})),
			);
		} catch {
			setCrmCampaignOptions(
				demoContacts
					.filter((contact): contact is ContactRow & { customerCampaignId: number; customerCampaignName: string } =>
						typeof contact.customerCampaignId === "number" && Boolean(contact.customerCampaignName),
					)
					.reduce<Array<{ id: number; name: string }>>((acc, contact) => {
						if (!acc.some((item) => item.id === contact.customerCampaignId)) {
							acc.push({ id: contact.customerCampaignId, name: contact.customerCampaignName });
						}
						return acc;
					}, [])
					.sort((first, second) => first.name.localeCompare(second.name, "pt-BR")),
			);
		}
	};

	const loadCampaigns = async () => {
		setLoading(true);

		try {
			const response = await marketingService.listCampaigns({
				page: filters.page + 1,
				perPage: filters.perPage,
				campaignId: filters.campaignId ? Number(filters.campaignId) : undefined,
				status: filters.status || undefined,
				senderClientId: filters.senderClientId ? Number(filters.senderClientId) : undefined,
				sendMode: (filters.sendMode || undefined) as "IMMEDIATE" | "ONE_TIME" | "RECURRING" | undefined,
			});

			const rows = response.data;
			setCampaigns(rows);
			setTotalRows(response.page.totalRows);
			setIsFallbackData(rows.length === 0);

			const summaries = await Promise.all(
				rows.map(async (campaign) => {
					try {
						const summary = await marketingService.getMonitoring(campaign.id);
						return [campaign.id, { ...summary, dispatchesLabel: buildDispatchesLabel(summary) }] as const;
					} catch {
						const fallback = demoSummaryByCampaign[campaign.id] || emptySummary;
						return [campaign.id, { ...fallback, dispatchesLabel: buildDispatchesLabel(fallback) }] as const;
					}
				}),
			);

			setSummaryMap(Object.fromEntries(summaries));

			if (rows.length === 0) {
				const filteredDemo = demoCampaigns.filter((campaign) => {
					const matchesCampaign = !filters.campaignId || campaign.id === Number(filters.campaignId);
					const matchesStatus = !filters.status || campaign.status === filters.status;
					const matchesSenderClient = !filters.senderClientId || campaign.senderClientId === Number(filters.senderClientId);
					const matchesSendMode = !filters.sendMode || campaign.scheduleRule?.sendMode === filters.sendMode;
					return matchesCampaign && matchesStatus && matchesSenderClient && matchesSendMode;
				});

				setCampaigns(filteredDemo);
				setTotalRows(filteredDemo.length);
				setSummaryMap(
					Object.fromEntries(
						filteredDemo.map((campaign) => {
							const summary = demoSummaryByCampaign[campaign.id] || emptySummary;
							return [campaign.id, { ...summary, dispatchesLabel: buildDispatchesLabel(summary) }];
						}),
					),
				);
				setIsFallbackData(true);
			}
		} catch {
			const filteredDemo = demoCampaigns.filter((campaign) => {
				const matchesCampaign = !filters.campaignId || campaign.id === Number(filters.campaignId);
				const matchesStatus = !filters.status || campaign.status === filters.status;
				const matchesSenderClient = !filters.senderClientId || campaign.senderClientId === Number(filters.senderClientId);
				const matchesSendMode = !filters.sendMode || campaign.scheduleRule?.sendMode === filters.sendMode;
				return matchesCampaign && matchesStatus && matchesSenderClient && matchesSendMode;
			});

			setCampaigns(filteredDemo);
			setTotalRows(filteredDemo.length);
			setSummaryMap(
				Object.fromEntries(
					filteredDemo.map((campaign) => {
						const summary = demoSummaryByCampaign[campaign.id] || emptySummary;
						return [campaign.id, { ...summary, dispatchesLabel: buildDispatchesLabel(summary) }];
					}),
				),
			);
			setIsFallbackData(true);
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async () => {
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

		try {
			await marketingService.createCampaign({
				name: draft.name,
				description: draft.description,
				senderClientId: Number(draft.senderClientId) || 1,
				content:
					draft.contentMode === "text"
						? { messageBody: draft.messageBody }
						: {
							templateName: draft.templateName,
							templateLanguage: selectedTemplate?.language || "pt_BR",
						},
				audienceDefinition: {
					manualIncludeJson: {
						contactIds: selectedContactIds,
					},
					estimatedAudienceCount: selectedContactIds.length,
				},
				scheduleRule: {
					sendMode: draft.scheduleMode,
					startAt: `${draft.startDate}T00:00:00.000Z`,
					allowedWeekdaysJson: draft.scheduleMode === "RECURRING" ? draft.weekdays.map((day) => Number(day)) : undefined,
					timeRangesJson: [{
						start: draft.dayPeriodStart,
						end: draft.dayPeriodEnd,
						frequencyDays: draft.scheduleMode === "RECURRING" ? Number(draft.frequencyDays) : undefined,
					}],
				},
			});
			toast.success("Disparo criado com sucesso.");
			setCreateOpen(false);
			setDraft({
				name: "",
				description: "",
				messageBody: "",
				senderClientId: "1",
				contentMode: "text",
				templateName: "",
				scheduleMode: "ONE_TIME",
				startDate: dayjs().format("YYYY-MM-DD"),
				weekdays: ["1", "2", "3", "4", "5"],
				frequencyDays: "1",
				dayPeriodStart: "09:00",
				dayPeriodEnd: "12:00",
			});
			setSelectedContactIds([]);
			setSelectedFile(null);
			await loadCampaigns();
			await loadCampaignFilterOptions();
		} catch {
			const localCampaign: MarketingCampaign = {
				id: Date.now(),
				name: draft.name,
				campaignDefinitionId: null,
				campaignDefinitionName: null,
				description: draft.description,
				status: "DRAFT",
				createdBy: 1,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				launchedAt: null,
				scheduleRule: {
					startAt: `${draft.startDate}T00:00:00.000Z`,
					endAt: null,
					sendMode: draft.scheduleMode,
					allowedWeekdaysJson: draft.scheduleMode === "RECURRING" ? draft.weekdays.map((day) => Number(day)) : undefined,
					timeRangesJson: [{
						start: draft.dayPeriodStart,
						end: draft.dayPeriodEnd,
						frequencyDays: draft.scheduleMode === "RECURRING" ? Number(draft.frequencyDays) : undefined,
					}],
				},
			};
			setCampaigns((current) => [localCampaign, ...current]);
			setCampaignFilterOptions((current) => [{ id: localCampaign.id, name: localCampaign.name }, ...current]);
			setSummaryMap((current) => ({
				...current,
				[localCampaign.id]: { ...emptySummary, dispatchesLabel: buildDispatchesLabel(emptySummary) },
			}));
			setCreateOpen(false);
			setSelectedContactIds([]);
			setSelectedFile(null);
			setIsFallbackData(true);
		}
	};

	const loadContacts = async () => {
		if (!createOpen) {
			return;
		}

		setContactsLoading(true);

		try {
			let eligibleCustomerIds: Set<number> | null = null;
			if (
				contactFilters.profileLevel !== "all" ||
				contactFilters.interactionLevel !== "all" ||
				contactFilters.purchaseLevel !== "all" ||
				contactFilters.ageLevel !== "all" ||
				contactFilters.purchaseInterestLevel !== "all"
			) {
				const customerIds = await wppApi.current.findCustomerIdsByProfileFilters({
					profileLevel: contactFilters.profileLevel !== "all" ? contactFilters.profileLevel : undefined,
					interactionLevel: contactFilters.interactionLevel !== "all" ? contactFilters.interactionLevel : undefined,
					purchaseLevel: contactFilters.purchaseLevel !== "all" ? contactFilters.purchaseLevel : undefined,
					ageLevel: contactFilters.ageLevel !== "all" ? contactFilters.ageLevel : undefined,
					purchaseInterestLevel:
						contactFilters.purchaseInterestLevel !== "all"
							? contactFilters.purchaseInterestLevel
							: undefined,
				});
				eligibleCustomerIds = new Set(customerIds);
			}

			const response = await wppApi.current.getContactsWithCustomer({
				name: contactFilters.search || undefined,
				page: contactFilters.page + 1,
				perPage: contactFilters.perPage,
			});

			const customerIds = Array.from(
				new Set(
					response.data
						.map((contact) => Number(contact.customerId))
						.filter((customerId) => Number.isInteger(customerId) && customerId > 0),
				),
			);

			const summaries = customerIds.length
				? await wppApi.current.getCustomerProfileSummaries({ customerIds })
				: [];

			const summariesByCustomer = new Map(summaries.map((summary) => [summary.customerId, summary]));
			const campaignsById = new Map(crmCampaignOptions.map((campaign) => [campaign.id, campaign.name]));
			const selectedCampaignIds = new Set(contactFilters.campaignIds.map((campaignId) => Number(campaignId)));

			const mapped = response.data
				.filter((contact) => {
					if (selectedCampaignIds.size > 0) {
						const campaignId = Number(contact.customer?.COD_CAMPANHA);
						if (!campaignId || !selectedCampaignIds.has(campaignId)) {
							return false;
						}
					}

					if (eligibleCustomerIds) {
						const customerId = Number(contact.customerId);
						if (!Number.isInteger(customerId) || !eligibleCustomerIds.has(customerId)) {
							return false;
						}
					}

					return true;
				})
				.map((contact) => ({
					id: contact.id,
					name: contact.name,
					phone: contact.phone,
					customerId: contact.customerId,
					customerName: contact.customer?.RAZAO || null,
					customerCampaignId: contact.customer?.COD_CAMPANHA || null,
					customerCampaignName:
						(contact.customer?.COD_CAMPANHA ? campaignsById.get(contact.customer.COD_CAMPANHA) : null) ||
						(contact.customer?.COD_CAMPANHA ? `Campanha #${contact.customer.COD_CAMPANHA}` : null),
					isBlocked: contact.isBlocked,
					conversationExpiration: contact.conversationExpiration,
					profileLabel: contact.customerId ? summariesByCustomer.get(contact.customerId)?.label || null : null,
					purchaseInterestLabel: contact.customerId
						? summariesByCustomer.get(contact.customerId)?.purchaseInterest.label || null
						: null,
					interactionTagLabel: contact.customerId
						? summariesByCustomer.get(contact.customerId)?.tags.interaction.label || null
						: null,
					purchaseTagLabel: contact.customerId
						? summariesByCustomer.get(contact.customerId)?.tags.purchase.label || null
						: null,
					ageTagLabel: contact.customerId ? summariesByCustomer.get(contact.customerId)?.tags.age.label || null : null,
				}));

			setContacts(mapped);
			setContactsTotal(response.pagination.total);
		} catch {
			const expectedProfileLabel =
				contactFilters.profileLevel !== "all"
					? (PROFILE_FILTER_OPTIONS.find((o) => o.value === contactFilters.profileLevel)?.label ?? null)
					: null;
			const expectedInteractionLabel =
				contactFilters.interactionLevel !== "all"
					? (INTERACTION_FILTER_OPTIONS.find((o) => o.value === contactFilters.interactionLevel)?.label ?? null)
					: null;
			const expectedPurchaseLabel =
				contactFilters.purchaseLevel !== "all"
					? (PURCHASE_FILTER_OPTIONS.find((o) => o.value === contactFilters.purchaseLevel)?.label ?? null)
					: null;
			const expectedAgeLabel =
				contactFilters.ageLevel !== "all"
					? (AGE_FILTER_OPTIONS.find((o) => o.value === contactFilters.ageLevel)?.label ?? null)
					: null;
			const expectedPurchaseInterestLabel =
				contactFilters.purchaseInterestLevel !== "all"
					? (PURCHASE_INTEREST_FILTER_OPTIONS.find((o) => o.value === contactFilters.purchaseInterestLevel)?.label ?? null)
					: null;

			const filtered = demoContacts.filter((contact) => {
				const matchesSearch =
					!contactFilters.search ||
					contact.name.toLowerCase().includes(contactFilters.search.toLowerCase()) ||
					contact.phone.includes(contactFilters.search);
				const matchesCampaign =
					contactFilters.campaignIds.length === 0 ||
					(Boolean(contact.customerCampaignId) && contactFilters.campaignIds.includes(String(contact.customerCampaignId)));
				const matchesProfile = !expectedProfileLabel || contact.profileLabel === expectedProfileLabel;
				const matchesInteraction = !expectedInteractionLabel || contact.interactionTagLabel === expectedInteractionLabel;
				const matchesPurchase = !expectedPurchaseLabel || contact.purchaseTagLabel === expectedPurchaseLabel;
				const matchesAge = !expectedAgeLabel || contact.ageTagLabel === expectedAgeLabel;
				const matchesPurchaseInterest = !expectedPurchaseInterestLabel || contact.purchaseInterestLabel === expectedPurchaseInterestLabel;
				return matchesSearch && matchesCampaign && matchesProfile && matchesInteraction && matchesPurchase && matchesAge && matchesPurchaseInterest;
			});

			const start = contactFilters.page * contactFilters.perPage;
			const end = start + contactFilters.perPage;
			setContacts(filtered.slice(start, end));
			setContactsTotal(filtered.length);
		} finally {
			setContactsLoading(false);
		}
	};

	const toggleContactSelection = (contactId: number) => {
		setSelectedContactIds((current) =>
			current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId],
		);
	};

	const handleOpenDetails = async (campaign: MarketingCampaign) => {
		setSelectedCampaign(campaign);
		setDetailsOpen(true);
		setDetailsLoading(true);

		try {
			const [campaignDetail, dispatches] = await Promise.all([
				marketingService.getCampaignById(campaign.id).catch(() => campaign),
				marketingService.listDispatches(campaign.id, 1, 10),
			]);
			setSelectedCampaign(campaignDetail);
			setSelectedDispatches(dispatches.data);
		} catch {
			setSelectedDispatches(demoDispatchRows);
		} finally {
			setDetailsLoading(false);
		}
	};

	const handleCancel = async (campaign: MarketingCampaign) => {
		try {
			const updated = await marketingService.cancelCampaign(campaign.id);
			setCampaigns((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
			setSummaryMap((current) => {
				const summary = current[campaign.id] || { ...emptySummary, dispatchesLabel: buildDispatchesLabel(emptySummary) };
				const nextSummary = {
					...summary,
					dispatches: {
						...summary.dispatches,
						CANCELLED: summary.dispatches.CANCELLED + summary.dispatches.PENDING + summary.dispatches.PROCESSING,
						PENDING: 0,
						PROCESSING: 0,
					},
				};

				return {
					...current,
					[campaign.id]: { ...nextSummary, dispatchesLabel: buildDispatchesLabel(nextSummary) },
				};
			});
			toast.success("Disparo cancelado.");
		} catch {
			setCampaigns((current) =>
				current.map((item) => (item.id === campaign.id ? { ...item, status: "CANCELLED", updatedAt: new Date().toISOString() } : item)),
			);
			toast.info("Cancelamento simulado para demo.");
		}
	};

	useEffect(() => {
		void loadCampaigns();
	}, [filters.page, filters.perPage, filters.campaignId, filters.status, filters.senderClientId, filters.sendMode]);

	useEffect(() => {
		void loadContacts();
	}, [
		createOpen,
		contactFilters.page,
		contactFilters.perPage,
		contactFilters.profileLevel,
		contactFilters.interactionLevel,
		contactFilters.purchaseLevel,
		contactFilters.ageLevel,
		contactFilters.purchaseInterestLevel,
		contactFilters.campaignIds,
	]);

	useEffect(() => {
		void loadCampaignFilterOptions();
	}, []);

	useEffect(() => {
		void loadCrmCampaignOptions();
	}, [token]);

	const filteredCountLabel = useMemo(() => `${totalRows || campaigns.length} disparos`, [campaigns.length, totalRows]);
	const customerCampaignOptions = useMemo(() => {
		return crmCampaignOptions.map((campaign) => ({ value: String(campaign.id), label: campaign.name }));
	}, [crmCampaignOptions]);

	return (
		<div className="relative box-border flex h-full w-full flex-col px-4 pt-5 md:px-10">
			<div className="mb-4 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Disparos em massa</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Gerencie disparos com filtros operacionais e monitoramento em tempo real.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Chip label={filteredCountLabel} />
						<Button variant="contained" onClick={() => setCreateOpen(true)}>
							+ Novo disparo
						</Button>
					</div>
				</div>

				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
					<TextField
						select
						size="small"
						label="Buscar por disparo"
						value={filters.campaignId}
						onChange={(event) => setFilters((current) => ({ ...current, campaignId: event.target.value, page: 0 }))}
					>
						<MenuItem value="">Todos os disparos</MenuItem>
						{campaignFilterOptions.map((option) => (
							<MenuItem key={option.id} value={String(option.id)}>
								{option.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						size="small"
						label="Canal"
						value={filters.senderClientId}
						onChange={(event) => setFilters((current) => ({ ...current, senderClientId: event.target.value, page: 0 }))}
					>
						<MenuItem value="">Todos os canais</MenuItem>
						{availableChannels.map((channel) => (
							<MenuItem key={channel.id} value={String(channel.id)}>
								{channel.name}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						size="small"
						label="Status"
						value={filters.status}
						onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value, page: 0 }))}
					>
						{statusOptions.map((option) => (
							<MenuItem key={option.value || "all"} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</TextField>
					<TextField
						select
						size="small"
						label="Modo de envio"
						value={filters.sendMode}
						onChange={(event) => setFilters((current) => ({ ...current, sendMode: event.target.value, page: 0 }))}
					>
						{sendModeOptions.map((option) => (
							<MenuItem key={option.value || "all"} value={option.value}>
								{option.label}
							</MenuItem>
						))}
					</TextField>
					<Button startIcon={<Search />} variant="outlined" onClick={() => void loadCampaigns()}>
						Buscar
					</Button>
				</div>
			</div>

			<div className="flex w-full flex-col gap-4">
				<TableContainer
					className="scrollbar-whatsapp w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
					sx={{
						height: "calc(100vh - 300px)",
						minHeight: "400px",
						maxHeight: "70vh",
						width: "100%",
					}}
				>
					<Table stickyHeader>
						<TableHead>
							<TableRow
								className="bg-slate-200 dark:bg-slate-800"
								sx={{
									"& .MuiTableCell-root": {
										borderBottom: "2px solid",
										borderColor: (theme) => (theme.palette.mode === "dark" ? "rgb(71 85 105)" : "rgb(226 232 240)"),
										fontWeight: 600,
										fontSize: "0.875rem",
										paddingTop: "1rem",
										paddingBottom: "1rem",
									},
								}}
							>
								<TableCell>Titulo do disparo</TableCell>
								<TableCell>Criado por</TableCell>
								<TableCell>Data criacao</TableCell>
								<TableCell>Periodo</TableCell>
								<TableCell>Recorrencia</TableCell>
								<TableCell>Contatos</TableCell>
								<TableCell>Status</TableCell>
								<TableCell>Acompanhamento</TableCell>
								<TableCell align="right">Acoes</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading && (
								<TableRow sx={{ height: "300px" }}>
									<TableCell colSpan={9} align="center" sx={{ borderBottom: "none" }}>
										<div className="flex flex-col items-center gap-3 py-8">
											<CircularProgress size={40} />
											<span className="text-sm font-medium text-gray-600 dark:text-gray-300">Carregando disparos...</span>
										</div>
									</TableCell>
								</TableRow>
							)}
							{canShowEmpty && (
								<TableRow sx={{ height: "300px" }}>
									<TableCell colSpan={9} align="center" sx={{ borderBottom: "none" }}>
										<div className="flex flex-col items-center gap-2 py-8">
											<span className="text-sm text-gray-500 dark:text-gray-400">Nenhum disparo encontrado</span>
										</div>
									</TableCell>
								</TableRow>
							)}
							{!loading &&
								campaigns.map((campaign) => {
									const summary = summaryMap[campaign.id] || { ...emptySummary, dispatchesLabel: buildDispatchesLabel(emptySummary) };

									return (
										<TableRow
											key={campaign.id}
											className="even:bg-indigo-700/5 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
											sx={{
												"& .MuiTableCell-root": {
													borderBottom: "1px solid",
													borderColor: (theme) =>
														theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
												},
											}}
										>
											<TableCell>
												<div>
													<p className="font-medium text-slate-900 dark:text-slate-100">{campaign.name}</p>
													<p className="text-xs text-slate-500 dark:text-slate-400">{campaign.description || "Sem descricao"}</p>
												</div>
											</TableCell>
											<TableCell>{`Usuario #${campaign.createdBy}`}</TableCell>
											<TableCell>{dayjs(campaign.createdAt).format("DD/MM/YYYY HH:mm")}</TableCell>
											<TableCell>{formatPeriod(campaign)}</TableCell>
											<TableCell>{formatRecurrence(campaign)}</TableCell>
											<TableCell>
												<span className="font-semibold">{summary.audience.totalSnapshots}</span>
											</TableCell>
											<TableCell>
												<Chip size="small" label={getStatusLabel(campaign.status)} color={statusColor(campaign.status)} />
											</TableCell>
											<TableCell>
												<div className="min-w-[260px]">
													<p className="text-sm text-slate-700 dark:text-slate-200">{summary.dispatchesLabel}</p>
												</div>
											</TableCell>
											<TableCell align="right">
												<div className="flex items-center justify-end gap-1">
													<IconButton
														title="Visualizar detalhes"
														size="small"
														onClick={() => void handleOpenDetails(campaign)}
														className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
													>
														<Visibility fontSize="small" />
													</IconButton>
													<IconButton
														title="Cancelar disparo"
														size="small"
														disabled={["CANCELLED", "COMPLETED"].includes(campaign.status)}
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

				<div className="flex items-center justify-end rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
					<TablePagination
						component="div"
						count={Number(totalRows || 0)}
						page={filters.page}
						rowsPerPage={filters.perPage}
						labelRowsPerPage="Entradas por pagina"
						labelDisplayedRows={(info) => `${info.from}-${info.to} de ${info.count}`}
						onRowsPerPageChange={(event) =>
							setFilters((current) => ({ ...current, perPage: Number(event.target.value), page: 0 }))
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

			<Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xl" fullWidth>
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
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
							<Send sx={{ fontSize: 18, color: "white" }} />
						</div>
						<div>
							<p className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo disparo</p>
							<p className="text-xs text-slate-500 dark:text-slate-400">Configure o canal, a mensagem e a lista de contatos</p>
						</div>
					</div>
				</DialogTitle>
				<DialogContent sx={{ backgroundColor: "background.default", paddingTop: "24px !important", paddingBottom: 3 }}>
					<div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
						<div className="grid gap-3">
							<div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
								<div className="mb-3 flex items-center gap-2">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">1</span>
								<p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Configuração</p>
							</div>
								<div className="grid grid-cols-2 gap-2">
									<TextField className="col-span-2" label="Titulo do disparo" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} size="small" required />
									<TextField select label="WhatsApp" value={draft.senderClientId} onChange={(event) => setDraft((current) => ({ ...current, senderClientId: event.target.value }))} size="small">
										{availableChannels.map((channel) => (
											<MenuItem key={channel.id} value={String(channel.id)}>
												{channel.name} • {channel.type}
											</MenuItem>
										))}
									</TextField>
									<TextField select label="Modo de envio" value={draft.scheduleMode} onChange={(event) => setDraft((current) => ({ ...current, scheduleMode: event.target.value as DraftForm["scheduleMode"] }))} size="small">
										{creationModeOptions.map((option) => (
											<MenuItem key={option.value} value={option.value}>
												{option.label}
											</MenuItem>
										))}
									</TextField>
									<TextField label="Data inicial" type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
									<TextField label="Descricao" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} size="small" />
									{draft.scheduleMode === "RECURRING" && (
										<>
											<TextField
												select
												SelectProps={{
													multiple: true,
													renderValue: (selected) => (selected as string[]).map((day) => weekdayOptions.find((option) => option.value === day)?.label || day).join(", "),
												}}
												label="Dias da semana"
												value={draft.weekdays}
												onChange={(event) => {
													const value = event.target.value;
													setDraft((current) => ({ ...current, weekdays: typeof value === "string" ? value.split(",") : value }));
												}}
												size="small"
											>
												{weekdayOptions.map((day) => (
													<MenuItem key={day.value} value={day.value}>
														{day.label}
													</MenuItem>
												))}
											</TextField>
											<TextField label="Frequencia (dias)" type="number" value={draft.frequencyDays} onChange={(event) => setDraft((current) => ({ ...current, frequencyDays: event.target.value }))} size="small" inputProps={{ min: 1, max: 365 }} />
										</>
									)}
									<TextField label="Inicio do periodo" type="time" value={draft.dayPeriodStart} onChange={(event) => setDraft((current) => ({ ...current, dayPeriodStart: event.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
									<TextField label="Fim do periodo" type="time" value={draft.dayPeriodEnd} onChange={(event) => setDraft((current) => ({ ...current, dayPeriodEnd: event.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
								<div className="mb-3 flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">2</span>
										<p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Conteúdo</p>
									</div>
									<ToggleButtonGroup exclusive value={draft.contentMode} onChange={(_, value) => value && setDraft((current) => ({ ...current, contentMode: value }))} size="small">
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
															<IconButton size="small" onClick={(e) => setEmojiAnchor((a) => a ? null : e.currentTarget)}>
																<EmojiEmotions fontSize="small" />
															</IconButton>
															<IconButton size="small" onClick={() => fileInputRef.current?.click()}>
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
												slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } } }}
											>
												<EmojiPicker
													onEmojiClick={(emojiData) => {
														setDraft((current) => ({ ...current, messageBody: `${current.messageBody}${emojiData.emoji}` }));
														setEmojiAnchor(null);
													}}
													lazyLoadEmojis
													height={320}
												/>
											</Popover>
										</div>
										<input ref={fileInputRef} type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
										{selectedFile && <Alert severity="info">Arquivo selecionado: {selectedFile.name}</Alert>}
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
											renderInput={(params) => <TextField {...params} label="Template" size="small" />}
											renderOption={(props, option) => (
												<li {...props} key={option.id}>
													<div>
														<p className="text-sm font-medium">{option.name}</p>
														<p className="text-xs text-slate-500">{option.category} • {option.language}</p>
													</div>
												</li>
											)}
										/>
										{selectedTemplate && (
											<div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
												<p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Pré-visualização do template</p>
												{selectedTemplatePreview ? selectedTemplatePreview.split("\n").map((line, index) => <p key={`${selectedTemplate.id}-${index}`}>{line}</p>) : <p>Nenhum conteúdo disponível para este template.</p>}
											</div>
										)}
									</div>
								)}
							</div>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
							<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div>
									<div className="flex items-center gap-2">
									<PeopleAlt sx={{ fontSize: 16, color: "text.secondary" }} />
									<p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Selecionar contatos</p>
								</div>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										Use filtros, paginação e seleção manual para compor a audiencia do disparo.
									</p>
								</div>
								<Chip
								label={`${selectedContactIds.length} selecionados`}
								color={selectedContactIds.length > 0 ? "success" : "default"}
								variant={selectedContactIds.length > 0 ? "filled" : "outlined"}
							/>
							</div>

							<div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
								<TextField
									size="small"
									label="Buscar contato"
									value={contactFilters.search}
									onChange={(event) => setContactFilters((current) => ({ ...current, search: event.target.value }))}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											setContactFilters((current) => ({ ...current, page: 0 }));
											void loadContacts();
										}
									}}
								/>
								<Button variant="outlined" startIcon={<Search />} onClick={() => void loadContacts()}>
									Buscar
								</Button>
							</div>

							<div className="mt-3 flex items-center gap-1.5">
							<FilterAlt sx={{ fontSize: 13, color: "text.disabled" }} />
							<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Segmentação</p>
						</div>
						<div className="mt-1.5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
								<TextField
									select
									size="small"
									label="Perfil"
									value={contactFilters.profileLevel}
									onChange={(event) => setContactFilters((current) => ({ ...current, profileLevel: event.target.value as ContactFilters["profileLevel"], page: 0 }))}
								>
									{PROFILE_FILTER_OPTIONS.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Interação"
									value={contactFilters.interactionLevel}
									onChange={(event) => setContactFilters((current) => ({ ...current, interactionLevel: event.target.value as ContactFilters["interactionLevel"], page: 0 }))}
								>
									{INTERACTION_FILTER_OPTIONS.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Compras"
									value={contactFilters.purchaseLevel}
									onChange={(event) => setContactFilters((current) => ({ ...current, purchaseLevel: event.target.value as ContactFilters["purchaseLevel"], page: 0 }))}
								>
									{PURCHASE_FILTER_OPTIONS.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Idade do cliente"
									value={contactFilters.ageLevel}
									onChange={(event) => setContactFilters((current) => ({ ...current, ageLevel: event.target.value as ContactFilters["ageLevel"], page: 0 }))}
								>
									{AGE_FILTER_OPTIONS.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Interesse de compra"
									value={contactFilters.purchaseInterestLevel}
									onChange={(event) => setContactFilters((current) => ({ ...current, purchaseInterestLevel: event.target.value as ContactFilters["purchaseInterestLevel"], page: 0 }))}
								>
									{PURCHASE_INTEREST_FILTER_OPTIONS.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
								<TextField
									select
									size="small"
									label="Campanha do cliente"
									value={contactFilters.campaignIds}
									onChange={(event) => {
										const value = event.target.value;
										setContactFilters((current) => ({
											...current,
											campaignIds: typeof value === "string" ? value.split(",") : value,
											page: 0,
										}));
									}}
									SelectProps={{
										multiple: true,
										renderValue: (selected) =>
											(selected as string[])
												.map((campaignId) => customerCampaignOptions.find((option) => option.value === campaignId)?.label || campaignId)
												.join(", "),
									}}
								>
									{customerCampaignOptions.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</TextField>
							</div>

<Divider sx={{ my: 2 }} />

							<TableContainer className="scrollbar-whatsapp overflow-auto rounded-xl border border-slate-200 dark:border-slate-800" sx={{ maxHeight: 340 }}>
								<Table stickyHeader size="small">
									<TableHead>
										<TableRow>
											<TableCell padding="checkbox" />
											<TableCell sx={{ minWidth: 160 }}>Contato</TableCell>
											<TableCell sx={{ minWidth: 120 }}>Telefone</TableCell>
											<TableCell sx={{ minWidth: 170 }}>Cliente</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Perfil</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Interação</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Compras</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Idade</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Interesse</TableCell>
											<TableCell sx={{ minWidth: 130 }}>Janela</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{contactsLoading ? (
											<TableRow>
												<TableCell colSpan={10} align="center" sx={{ py: 8 }}>
													<CircularProgress size={28} />
												</TableCell>
											</TableRow>
										) : contacts.length === 0 ? (
											<TableRow>
												<TableCell colSpan={10} align="center" sx={{ py: 8 }}>
													Nenhum contato encontrado
												</TableCell>
											</TableRow>
										) : (
											contacts.map((contact) => (
												<TableRow key={contact.id} hover>
													<TableCell padding="checkbox">
														<Checkbox checked={selectedContactIds.includes(contact.id)} onChange={() => toggleContactSelection(contact.id)} />
													</TableCell>
													<TableCell>
														<div className="max-w-[170px]">
															<p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{contact.name}</p>
															{contact.isBlocked && <p className="text-[11px] text-red-500">Bloqueado</p>}
														</div>
													</TableCell>
													<TableCell>
														<p className="text-xs text-slate-700 dark:text-slate-200">{contact.phone}</p>
													</TableCell>
													<TableCell>
														<div className="max-w-[190px]">
															<p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{contact.customerName || "Sem cliente"}</p>
															<p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{contact.customerCampaignName || "Sem campanha"}</p>
														</div>
													</TableCell>
													<TableCell>
														{contact.profileLabel ? (
															<Chip size="small" label={contact.profileLabel} variant="outlined" sx={{ height: 20, "& .MuiChip-label": { fontSize: "0.68rem", px: "6px", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis" } }} />
														) : (
															<span className="text-[11px] text-slate-500 dark:text-slate-400">-</span>
														)}
													</TableCell>
													<TableCell>
														{contact.interactionTagLabel ? (
															<Chip size="small" label={contact.interactionTagLabel} variant="outlined" sx={{ height: 20, "& .MuiChip-label": { fontSize: "0.68rem", px: "6px", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis" } }} />
														) : (
															<span className="text-[11px] text-slate-500 dark:text-slate-400">-</span>
														)}
													</TableCell>
													<TableCell>
														{contact.purchaseTagLabel ? (
															<Chip size="small" label={contact.purchaseTagLabel} variant="outlined" sx={{ height: 20, "& .MuiChip-label": { fontSize: "0.68rem", px: "6px", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis" } }} />
														) : (
															<span className="text-[11px] text-slate-500 dark:text-slate-400">-</span>
														)}
													</TableCell>
													<TableCell>
														{contact.ageTagLabel ? (
															<Chip size="small" label={contact.ageTagLabel} variant="outlined" sx={{ height: 20, "& .MuiChip-label": { fontSize: "0.68rem", px: "6px", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis" } }} />
														) : (
															<span className="text-[11px] text-slate-500 dark:text-slate-400">-</span>
														)}
													</TableCell>
													<TableCell>
														{contact.purchaseInterestLabel ? (
															<Chip size="small" label={contact.purchaseInterestLabel} color="info" sx={{ height: 20, "& .MuiChip-label": { fontSize: "0.68rem", px: "6px", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis" } }} />
														) : (
															<span className="text-[11px] text-slate-500 dark:text-slate-400">-</span>
														)}
													</TableCell>
													<TableCell>
														<p className="text-[11px] text-slate-600 dark:text-slate-300">
															{contact.conversationExpiration
																? `Ate ${dayjs(contact.conversationExpiration).format("DD/MM HH:mm")}`
																: "Sem janela ativa"}
														</p>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</TableContainer>

							<div className="mt-3 flex justify-end">
								<TablePagination
									component="div"
									count={contactsTotal}
									page={contactFilters.page}
									rowsPerPage={contactFilters.perPage}
									labelRowsPerPage="Contatos por pagina"
									labelDisplayedRows={(info) => `${info.from}-${info.to} de ${info.count}`}
									onRowsPerPageChange={(event) =>
										setContactFilters((current) => ({ ...current, perPage: Number(event.target.value), page: 0 }))
									}
									onPageChange={(_, newPage) => setContactFilters((current) => ({ ...current, page: newPage }))}
								/>
							</div>
						</div>
					</div>
				</DialogContent>
				<DialogActions sx={{ borderTop: "1px solid", borderColor: "divider", px: 3, py: 1.5 }}>
					<Button onClick={() => setCreateOpen(false)} color="inherit">Fechar</Button>
					<Button variant="contained" endIcon={<Send fontSize="small" />} onClick={() => void handleCreate()}>
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
						<p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Detalhes do disparo</p>
						<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
					) : (
						<div className="grid gap-4">
							<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
									<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
										Disparo
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
										{selectedCampaign.name}
									</p>
									<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedCampaign.description || "Sem descricao"}</p>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
									<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
										Status
									</p>
									<div className="mt-2">
										<Chip size="small" label={getStatusLabel(selectedCampaign.status)} color={statusColor(selectedCampaign.status)} />
									</div>
									<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Atualizado em {dayjs(selectedCampaign.updatedAt).format("DD/MM/YYYY HH:mm")}</p>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
									<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
										Criado por
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{`Usuario #${selectedCampaign.createdBy}`}</p>
									<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Em {dayjs(selectedCampaign.createdAt).format("DD/MM/YYYY HH:mm")}</p>
								</div>
								<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
									<p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
										Periodo
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPeriod(selectedCampaign)}</p>
									<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Janela configurada para o disparo</p>
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
								<div className="mb-4 flex items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ultimos destinatarios</p>
										<p className="text-xs text-slate-500 dark:text-slate-400">
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
											className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70"
										>
											<div>
												<p className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.audienceSnapshot?.contactName || "Contato"}</p>
												<p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
													{row.audienceSnapshot?.phoneE164 || "Sem telefone"}
													{row.lastError ? ` • ${row.lastError}` : ""}
												</p>
											</div>
											<Chip size="small" label={getStatusLabel(row.status)} color={statusColor(row.status)} />
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
		</div>
	);
}
