"use client";

import { useAuthContext } from "@/app/auth-context";
import { AppContext } from "@/app/(private)/[instance]/app-context";
import { useCustomersContext } from "@/app/(private)/[instance]/(cruds)/customers/customers-context";
import { DetailedChat, useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import CustomerCrmDetailModal from "@/app/(private)/[instance]/(main)/(chats-menu)/(start-chat-modal)/customer-crm-detail-modal";
import { AI_MODEL_CATALOG } from "@/lib/ai-model-catalog";
import AssistantMarkdown from "@/lib/components/assistant-markdown";
import aiService from "@/lib/services/ai.service";
import { executeGeneratedReport } from "@/lib/reports/api";
import usersService from "@/lib/services/users.service";
import type {
	SupervisorAiAction,
	SupervisorAiChatMode,
	SupervisorAiContextInput,
	SupervisorAiGeneratedReportArtifact,
	SupervisorAiMessage,
	SupervisorAiReportPreview,
	SupervisorAiSession,
	SupervisorAiSessionDetail,
	SupervisorAiSource,
} from "@/lib/types/sdk-local.types";
import { Customer, User, UserRole } from "@/lib/sdk-local";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import AddIcon from "@mui/icons-material/Add";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SendIcon from "@mui/icons-material/Send";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import {
	Alert,
	Autocomplete,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	IconButton,
	InputAdornment,
	InputLabel,
	List,
	ListItemButton,
	ListItemText,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

const assistantBubbleClass = "self-start max-w-[88%] rounded-2xl rounded-bl-none border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const userBubbleClass = "self-end max-w-[88%] rounded-2xl rounded-br-none bg-green-200 px-4 py-3 text-slate-800 shadow-sm dark:bg-green-800 dark:text-slate-100";

const AVAILABLE_MODELS = [
	{ value: "", label: "Padrão do tenant" },
	...AI_MODEL_CATALOG,
];

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.log";
const MAX_FILES = 3;

const DEFAULT_SUGGESTIONS = [
	"Mostre os indicadores de atendimento de hoje",
	"Quais operadores precisam de atenção?",
	"Gere um relatório de desempenho dos últimos 7 dias",
];

const CHAT_CONTEXT_SUGGESTIONS = [
	"Resuma esta conversa e destaque as pendências",
	"Analise o cliente deste atendimento",
	"Qual é o próximo passo recomendado para este atendimento?",
];

const REPORT_SUGGESTIONS = [
	"Gere um relatório de desempenho dos operadores de hoje",
	"Compare os atendimentos dos últimos 7 dias por setor",
	"Crie um relatório executivo com os principais indicadores do mês",
];

const SUPERVISOR_MODES: Array<{ value: SupervisorAiChatMode; label: string; description: string }> = [
	{ value: "STANDARD", label: "Padrão", description: "Consultas gerais e ações supervisionadas no CRM." },
	{ value: "REPORTS", label: "Relatórios", description: "Análises somente leitura com prévias e exportação de dados." },
];

function supervisorModeLabel(mode?: SupervisorAiChatMode): string {
	return SUPERVISOR_MODES.find((entry) => entry.value === mode)?.label ?? "Padrão";
}

type ContextDraft = {
	chatId: string;
	customerId: string;
	dateFrom: string;
	dateTo: string;
	operatorIds: number[];
	sectorIds: number[];
	includeMetrics: boolean;
};

const EMPTY_CONTEXT_DRAFT: ContextDraft = {
	chatId: "",
	customerId: "",
	dateFrom: "",
	dateTo: "",
	operatorIds: [],
	sectorIds: [],
	includeMetrics: false,
};

function toLocalDateTime(value?: string): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function hasContextValues(context: SupervisorAiContextInput): boolean {
	return Object.values(context).some((value) => (
		Array.isArray(value) ? value.length > 0 : value !== undefined && value !== false
	));
}

function customerLabel(customer: Customer): string {
	return customer.RAZAO || customer.FANTASIA || `Cliente #${customer.CODIGO}`;
}

function chatLabel(chat: DetailedChat): string {
	const contact = chat.contact?.name?.trim() || chat.customer?.RAZAO?.trim() || "Contato sem nome";
	const phone = chat.contact?.phone?.trim();
	return [`Chat #${chat.id}`, contact, phone].filter(Boolean).join(" · ");
}

function sourceLabel(type: string) {
	switch (type) {
		case "action": return "Ação";
		case "chat": return "Chat";
		case "contact": return "Contato";
		case "customer": return "Cliente";
		case "metrics": return "Métricas";
		case "report": return "Relatório";
		case "sql": return "SQL";
		default: return "Fonte";
	}
}

function buildCsv(preview: SupervisorAiReportPreview): string {
	const escape = (v: string | number | boolean | null) => {
		const s = String(v ?? "");
		return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const header = preview.columns.map(escape).join(",");
	const body = preview.rows.map((row) => preview.columns.map((col) => escape(row[col] ?? null)).join(",")).join("\n");
	return `${header}\n${body}`;
}

function buildTxt(preview: SupervisorAiReportPreview): string {
	const cell = (value: string | number | boolean | null) => String(value ?? "").replace(/[\t\r\n]+/g, " ");
	const header = preview.columns.map(cell).join("\t");
	const body = preview.rows.map((row) => preview.columns.map((column) => cell(row[column] ?? null)).join("\t")).join("\n");
	return [preview.title, preview.summary, "", header, body].join("\n");
}

function ReportPreviewPanel({ preview, artifact }: { preview: SupervisorAiReportPreview; artifact?: SupervisorAiGeneratedReportArtifact | null }) {
	const router = useRouter();
	const params = useParams<{ instance: string }>();
	const [livePreview, setLivePreview] = useState<SupervisorAiReportPreview | null>(null);
	useEffect(() => {
		if (!artifact) return;
		const defaults = Object.fromEntries(artifact.filters.flatMap((raw) => raw.defaultValue !== undefined && typeof raw.id === "string" ? [[raw.id, raw.defaultValue]] : []));
		void executeGeneratedReport(artifact.id, defaults).then((execution) => {
			const dataset = execution.datasets.find((item) => !item.error);
			if (!dataset) return;
			setLivePreview({ ...preview, columns: dataset.columns, rows: dataset.rows.slice(0, 50).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === null || ["string", "number", "boolean"].includes(typeof value) ? value as string | number | boolean | null : String(value)])) ) });
		}).catch(() => undefined);
	}, [artifact, preview]);
	const currentPreview = livePreview ?? preview;
	const numericColumn = currentPreview.columns.find((column) => currentPreview.rows.some((row) => typeof row[column] === "number"));
	const labelColumn = currentPreview.columns.find((column) => column !== numericColumn);
	const maxValue = numericColumn ? Math.max(...currentPreview.rows.map((row) => Number(row[numericColumn]) || 0), 1) : 1;
	const handleExportCsv = () => {
		const csv = buildCsv(currentPreview);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${currentPreview.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	const handleExportTxt = () => {
		const txt = buildTxt(currentPreview);
		const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${currentPreview.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
			<div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{currentPreview.title}</p>
					<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{currentPreview.summary}</p>
				</div>
				<div className="flex shrink-0 gap-2">
					{currentPreview.availableFormats.includes("csv") && (
						<button
							type="button"
							onClick={handleExportCsv}
							className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
						>
							Exportar CSV
						</button>
					)}
					{currentPreview.availableFormats.includes("txt") && (
						<button
							type="button"
							onClick={handleExportTxt}
							className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
						>
							Exportar TXT
						</button>
					)}
				</div>
			</div>
			<div className="overflow-x-auto">
				{artifact && numericColumn && (
					<div className="grid h-28 grid-cols-6 items-end gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
						{currentPreview.rows.slice(0, 6).map((row, index) => (
							<Tooltip key={index} title={`${String(row[labelColumn ?? ""] ?? "Item")}: ${String(row[numericColumn] ?? 0)}`}>
								<div className="flex h-full flex-col items-center justify-end gap-1"><div className="w-full min-w-5 rounded-t bg-violet-500" style={{ height: `${Math.max(8, ((Number(row[numericColumn]) || 0) / maxValue) * 75)}%` }} /><span className="max-w-full truncate text-[10px] text-slate-500">{String(row[labelColumn ?? ""] ?? index + 1)}</span></div>
							</Tooltip>
						))}
					</div>
				)}
				<table className="w-full text-left text-xs">
					<thead>
						<tr className="bg-slate-100 dark:bg-slate-800">
							{currentPreview.columns.map((col) => (
								<th key={col} className="whitespace-nowrap px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{col}</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 dark:divide-slate-700">
						{currentPreview.rows.map((row, ri) => (
							<tr key={ri} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
								{currentPreview.columns.map((col) => (
									<td key={col} className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300">{String(row[col] ?? "—")}</td>
								))}
							</tr>
						))}
						{currentPreview.rows.length === 0 && (
							<tr>
								<td colSpan={currentPreview.columns.length} className="px-3 py-4 text-center text-slate-400 dark:text-slate-500">Sem dados para o período.</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{artifact && <div className="border-t border-slate-200 p-3 dark:border-slate-700"><Button size="small" variant="contained" onClick={() => router.push(`/${params.instance}/reports/generated/${artifact.id}`)}>Abrir relatório</Button></div>}
		</div>
	);
}

function actionTarget(action: SupervisorAiAction): string {
	const name = typeof action.payload.contactName === "string" ? action.payload.contactName.trim() : "";
	const phone = typeof action.payload.phone === "string" ? action.payload.phone.trim() : "";
	return [name, phone].filter(Boolean).join(" · ") || action.label;
}

function SupervisorActionCard({
	action,
	busy,
	disabled,
	onConfirm,
	onCancel,
}: {
	action: SupervisorAiAction;
	busy: boolean;
	disabled: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const executedChatId = typeof action.result?.chatId === "number" ? action.result.chatId : null;
	const decisionAt = action.executedAt ?? action.cancelledAt ?? action.confirmedAt;
	const status = {
		PENDING: { severity: "warning" as const, text: "Aguardando sua confirmação" },
		EXECUTING: { severity: "info" as const, text: "Executando ação confirmada" },
		EXECUTED: { severity: "success" as const, text: executedChatId ? `Chat #${executedChatId} iniciado` : "Ação executada" },
		CANCELLED: { severity: "info" as const, text: "Ação cancelada" },
		FAILED: { severity: "error" as const, text: action.errorMessage || "Falha ao executar a ação" },
	}[action.status];

	return (
		<Alert
			severity={status.severity}
			className="mt-3"
			action={action.status === "PENDING" ? (
				<Stack direction="row" spacing={1}>
					<Button size="small" color="inherit" onClick={onCancel} disabled={busy || disabled}>Cancelar</Button>
					<Button size="small" variant="contained" onClick={onConfirm} disabled={busy || disabled}>Revisar e confirmar</Button>
				</Stack>
			) : undefined}
		>
			<p className="text-sm font-semibold">{action.label}</p>
			<p className="mt-0.5 text-xs">{actionTarget(action)}</p>
			<p className="mt-1 text-xs">{status.text}</p>
			{action.status !== "PENDING" && action.decidedByUserName && (
				<p className="mt-1 text-xs">
					Decisão registrada por {action.decidedByUserName}
					{decisionAt ? ` em ${new Date(decisionAt).toLocaleString("pt-BR")}` : ""}.
				</p>
			)}
			{action.status === "PENDING" && (
				<p className="mt-1 text-xs font-medium">
					{disabled ? "Restaure a sessão para decidir esta ação." : "Nenhuma ação será executada sem sua confirmação."}
				</p>
			)}
		</Alert>
	);
}

export default function AiSupervisorPage() {
	const { token, user, instance } = useAuthContext();
	const { openModal, closeModal } = useContext(AppContext);
	const { searchCustomers } = useCustomersContext();
	const { chats, currentChat, monitorChats, openChat, parameters, sectors, wppApi } = useWhatsappContext();
	const router = useRouter();
	const searchParams = useSearchParams();
	const userLevel = String(user?.NIVEL ?? "");
	const canAccess = userLevel === UserRole.ADMIN || userLevel === "SUPERVISOR";
	const suggestedContext = useMemo(() => {
		const routeChatId = Number(searchParams.get("chatId"));
		const routeCustomerId = Number(searchParams.get("customerId"));
		const routeContext = Number.isInteger(routeChatId) && routeChatId > 0
			? {
				chatId: routeChatId,
				...(Number.isInteger(routeCustomerId) && routeCustomerId > 0 ? { customerId: routeCustomerId } : {}),
			}
			: null;
		if (routeContext) return routeContext;
		if (!currentChat || currentChat.chatType !== "wpp" || !Number.isInteger(currentChat.id) || currentChat.id <= 0) {
			return null;
		}
		const chat = currentChat as DetailedChat & {
			customer?: { CODIGO?: number | null } | null;
			contact?: { customerId?: number | null } | null;
		};
		const rawCustomerId = chat.customer?.CODIGO ?? chat.contact?.customerId ?? null;
		const customerId = typeof rawCustomerId === "number" && rawCustomerId > 0 ? rawCustomerId : undefined;
		return { chatId: chat.id, ...(customerId ? { customerId } : {}) };
	}, [currentChat, searchParams]);
	const availableChats = useMemo(() => {
		const unique = new Map<number, DetailedChat>();
		for (const chat of [...chats, ...monitorChats]) unique.set(chat.id, chat);
		if (currentChat?.chatType === "wpp") unique.set(currentChat.id, currentChat as DetailedChat);
		return Array.from(unique.values()).sort((left, right) => right.id - left.id);
	}, [chats, currentChat, monitorChats]);

	// Tenant config (for model filtering)
	const [configAvailableModels, setConfigAvailableModels] = useState<string[] | null>(null);

	// Sessions state
	const [sessions, setSessions] = useState<SupervisorAiSession[]>([]);
	const [selectedSession, setSelectedSession] = useState<SupervisorAiSession | null>(null);
	const [messages, setMessages] = useState<SupervisorAiMessage[]>([]);
	const [actions, setActions] = useState<SupervisorAiAction[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [archivingId, setArchivingId] = useState<number | null>(null);
	const [changingMode, setChangingMode] = useState(false);

	// Composer state
	const [sending, setSending] = useState(false);
	const [message, setMessage] = useState("");
	const [selectedModel, setSelectedModel] = useState("");
	const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; content: string }>>([]);
	const [decidingActionId, setDecidingActionId] = useState<number | null>(null);
	const [actionToConfirm, setActionToConfirm] = useState<SupervisorAiAction | null>(null);
	const [streamingQuestion, setStreamingQuestion] = useState("");
	const [streamingContent, setStreamingContent] = useState("");
	const [messageContext, setMessageContext] = useState<SupervisorAiContextInput>({});
	const [contextDialogOpen, setContextDialogOpen] = useState(false);
	const [contextDraft, setContextDraft] = useState<ContextDraft>(EMPTY_CONTEXT_DRAFT);
	const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
	const [selectedContextCustomer, setSelectedContextCustomer] = useState<Customer | null>(null);
	const [customerSearchTerm, setCustomerSearchTerm] = useState("");
	const [loadingCustomers, setLoadingCustomers] = useState(false);
	const [extraChatOptions, setExtraChatOptions] = useState<DetailedChat[]>([]);
	const [selectedContextChat, setSelectedContextChat] = useState<DetailedChat | null>(null);
	const [chatSearchTerm, setChatSearchTerm] = useState("");
	const [loadingChat, setLoadingChat] = useState(false);
	const [operators, setOperators] = useState<User[]>([]);

	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const sendAbortRef = useRef<AbortController | null>(null);
	const lastSuggestedContextKeyRef = useRef<string | null>(null);
	const hasMessageContext = hasContextValues(messageContext);
	const selectedMode: SupervisorAiChatMode = selectedSession?.mode ?? "STANDARD";
	const isReportsMode = selectedMode === "REPORTS";
	const suggestions = isReportsMode
		? REPORT_SUGGESTIONS
		: messageContext.chatId ? CHAT_CONTEXT_SUGGESTIONS : DEFAULT_SUGGESTIONS;
	const chatOptions = useMemo(() => {
		const unique = new Map<number, DetailedChat>();
		for (const chat of [...availableChats, ...extraChatOptions]) unique.set(chat.id, chat);
		return Array.from(unique.values());
	}, [availableChats, extraChatOptions]);

	// Visible models — filtered by tenant config if set
	const visibleModels = AVAILABLE_MODELS.filter(
		(m) => m.value === "" || configAvailableModels === null || configAvailableModels.includes(m.value),
	);

	useEffect(() => {
		if (!suggestedContext) return;
		const key = JSON.stringify(suggestedContext);
		if (lastSuggestedContextKeyRef.current === key) return;
		lastSuggestedContextKeyRef.current = key;
		setMessageContext((current) => hasContextValues(current) ? current : suggestedContext);
	}, [suggestedContext]);

	useEffect(() => {
		if (typeof token !== "string") return;
		usersService.getUsers({ perPage: "500" })
			.then(({ data }) => setOperators(data))
			.catch(() => setOperators([]));
	}, [token]);

	useEffect(() => {
		if (!contextDialogOpen || !customerSearchTerm.trim()) return;
		let active = true;
		const timeout = setTimeout(() => {
			const term = customerSearchTerm.trim();
			const filter = /^\d+$/.test(term) ? "CODIGO" : "RAZAO";
			setLoadingCustomers(true);
			void searchCustomers(term, filter)
				.then((results) => {
					if (!active) return;
					setCustomerOptions((current) => {
						const unique = new Map<number, Customer>();
						for (const customer of [...current, ...results]) unique.set(customer.CODIGO, customer);
						return Array.from(unique.values());
					});
					if (!selectedContextCustomer && contextDraft.customerId) {
						const exact = results.find((customer) => customer.CODIGO === Number(contextDraft.customerId));
						if (exact) {
							setSelectedContextCustomer(exact);
							setCustomerSearchTerm(customerLabel(exact));
						}
					}
				})
				.finally(() => {
					if (active) setLoadingCustomers(false);
				});
		}, 350);

		return () => {
			active = false;
			clearTimeout(timeout);
		};
	}, [contextDialogOpen, contextDraft.customerId, customerSearchTerm, searchCustomers, selectedContextCustomer]);

	useEffect(() => {
		if (!contextDialogOpen || !/^\d+$/.test(chatSearchTerm.trim())) return;
		const chatId = Number(chatSearchTerm.trim());
		if (!Number.isInteger(chatId) || chatId <= 0 || chatOptions.some((chat) => chat.id === chatId)) return;

		let active = true;
		const timeout = setTimeout(() => {
			setLoadingChat(true);
			void wppApi.current.getChatById(chatId)
				.then((loaded) => {
					if (!active) return;
					const messages = loaded.messages ?? [];
					const chat = {
						...loaded,
						chatType: "wpp" as const,
						isUnread: false,
						lastMessage: messages.at(-1) ?? null,
					} as DetailedChat;
					setExtraChatOptions((current) => current.some((entry) => entry.id === chat.id) ? current : [chat, ...current]);
					if (!selectedContextChat && Number(contextDraft.chatId) === chat.id) {
						setSelectedContextChat(chat);
						setChatSearchTerm(chatLabel(chat));
					}
				})
				.catch(() => { /* A busca local continua disponível. */ })
				.finally(() => {
					if (active) setLoadingChat(false);
				});
		}, 350);

		return () => {
			active = false;
			clearTimeout(timeout);
		};
	}, [chatOptions, chatSearchTerm, contextDialogOpen, contextDraft.chatId, selectedContextChat, wppApi]);

	// Fetch tenant config to apply model filter
	useEffect(() => {
		if (typeof token !== "string" || !instance) return;
		const authToken = token;
		const inst = instance;
		void aiService.getTenantConfig(inst, authToken).then((config) => {
			setConfigAvailableModels(config.availableModels ?? null);
		}).catch(() => { /* silently ignore — use all models */ });
	}, [token, instance]);

	// Load sessions when tab changes
	useEffect(() => {
		if (typeof token !== "string" || !canAccess) return;
		const authToken = token;

		async function loadSessions() {
			try {
				setLoadingSessions(true);
				const status = showArchived ? "ARCHIVED" : "ACTIVE";
				const data = await aiService.listSupervisorSessions(authToken, status);
				setSessions(data);
				if (!showArchived && data.length > 0) {
					setSelectedSession((current) => {
						if (current && data.some((s) => s.id === current.id)) return current;
						return data[0] ?? null;
					});
				} else if (showArchived) {
					setSelectedSession(null);
					setMessages([]);
					setActions([]);
				}
			} catch (error) {
				toast.error(`Falha ao carregar sessões: ${sanitizeErrorMessage(error)}`);
			} finally {
				setLoadingSessions(false);
			}
		}

		void loadSessions();
	}, [canAccess, token, showArchived]);

	// Load detail when session changes
	useEffect(() => {
		if (typeof token !== "string" || !selectedSession) return;
		const authToken = token;
		const currentSession = selectedSession;

		async function loadSessionDetail() {
			try {
				setLoadingDetail(true);
				const detail: SupervisorAiSessionDetail = await aiService.getSupervisorSession(currentSession.id, authToken);
				setSelectedSession(detail.session);
				setMessages(detail.messages);
				setActions(detail.actions ?? []);
			} catch (error) {
				toast.error(`Falha ao carregar conversa: ${sanitizeErrorMessage(error)}`);
			} finally {
				setLoadingDetail(false);
			}
		}

		void loadSessionDetail();
	}, [selectedSession?.id, token]);

	// Auto-scroll
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [messages.length, selectedSession?.id, streamingContent]);

	useEffect(() => () => sendAbortRef.current?.abort(), []);

	async function handleCreateSession() {
		if (typeof token !== "string" || sending || changingMode) return;
		try {
			const session = await aiService.createSupervisorSession({ mode: selectedMode }, token);
			setSessions((current) => [session, ...current]);
			setSelectedSession(session);
			setMessages([]);
			setActions([]);
			if (showArchived) setShowArchived(false);
		} catch (error) {
			toast.error(`Falha ao criar sessão: ${sanitizeErrorMessage(error)}`);
		}
	}

	async function handleModeChange(mode: SupervisorAiChatMode) {
		if (typeof token !== "string" || sending || changingMode || showArchived || mode === selectedMode) return;
		try {
			setChangingMode(true);
			if (!selectedSession || selectedSession.lastMessageAt !== null || messages.length > 0) {
				const session = await aiService.createSupervisorSession({ mode }, token);
				setSessions((current) => [session, ...current]);
				setSelectedSession(session);
				setMessages([]);
				setActions([]);
				toast.success(`Nova conversa criada no modo ${supervisorModeLabel(mode)}.`);
				return;
			}

			const updated = await aiService.patchSupervisorSession(selectedSession.id, { mode }, token);
			setSelectedSession(updated);
			setSessions((current) => current.map((session) => session.id === updated.id ? updated : session));
			toast.success(`Modo alterado para ${supervisorModeLabel(mode)}.`);
		} catch (error) {
			toast.error(`Falha ao alterar o modo: ${sanitizeErrorMessage(error)}`);
		} finally {
			setChangingMode(false);
		}
	}

	async function handleArchiveToggle(session: SupervisorAiSession, event: React.MouseEvent) {
		event.stopPropagation();
		if (typeof token !== "string" || sending) return;
		const nextStatus = session.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
		try {
			setArchivingId(session.id);
			await aiService.patchSupervisorSessionStatus(session.id, nextStatus, token);
			setSessions((current) => current.filter((s) => s.id !== session.id));
			if (selectedSession?.id === session.id) {
				setSelectedSession(null);
				setMessages([]);
				setActions([]);
			}
			const label = nextStatus === "ARCHIVED" ? "arquivada" : "restaurada";
			toast.success(`Sessão ${label} com sucesso.`);
		} catch (error) {
			toast.error(`Erro ao arquivar sessão: ${sanitizeErrorMessage(error)}`);
		} finally {
			setArchivingId(null);
		}
	}

	async function handleSendMessage() {
		if (typeof token !== "string" || !selectedSession || !message.trim() || sending) return;
		const sentMessage = message.trim();
		const sentFiles = attachedFiles;
		const sessionId = selectedSession.id;
		const abortController = new AbortController();
		sendAbortRef.current = abortController;
		try {
			setSending(true);
			setMessage("");
			setAttachedFiles([]);
			setStreamingQuestion(sentMessage);
			setStreamingContent("");
			const result = await aiService.streamSupervisorMessage(
				sessionId,
				{
					message: sentMessage,
					...(hasMessageContext ? { context: messageContext } : {}),
					...(selectedModel ? { model: selectedModel } : {}),
					...(sentFiles.length > 0 ? { fileContext: sentFiles } : {}),
				},
				token,
				{
					signal: abortController.signal,
					onDelta: (text) => setStreamingContent((current) => current + text),
				},
			);
			setSelectedSession(result.session);
			setSessions((current) => {
				const next = current.filter((s) => s.id !== result.session.id);
				return [result.session, ...next];
			});
			setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
			setActions((current) => [...current, ...(result.actions ?? [])]);
		} catch (error) {
			if (abortController.signal.aborted) {
				toast.info("Resposta interrompida. O conteúdo parcial foi salvo no histórico.");
				await new Promise((resolve) => setTimeout(resolve, 400));
				try {
					const detail = await aiService.getSupervisorSession(sessionId, token);
					setSelectedSession(detail.session);
					setMessages(detail.messages);
					setActions(detail.actions ?? []);
				} catch {
					// A próxima abertura da sessão recupera o conteúdo parcial persistido.
				}
			} else {
				setMessage(sentMessage);
				setAttachedFiles(sentFiles);
				toast.error(`Falha ao enviar mensagem: ${sanitizeErrorMessage(error)}`);
			}
		} finally {
			sendAbortRef.current = null;
			setStreamingQuestion("");
			setStreamingContent("");
			setSending(false);
		}
	}

	function handleStopStreaming() {
		sendAbortRef.current?.abort();
	}

	function openContextDialog() {
		const draft = {
			chatId: messageContext.chatId ? String(messageContext.chatId) : "",
			customerId: messageContext.customerId ? String(messageContext.customerId) : "",
			dateFrom: toLocalDateTime(messageContext.dateFrom),
			dateTo: toLocalDateTime(messageContext.dateTo),
			operatorIds: messageContext.operatorIds ?? [],
			sectorIds: messageContext.sectorIds ?? [],
			includeMetrics: messageContext.includeMetrics === true,
		};
		const initialChat = draft.chatId ? chatOptions.find((chat) => chat.id === Number(draft.chatId)) ?? null : null;
		const initialCustomer = draft.customerId
			? customerOptions.find((customer) => customer.CODIGO === Number(draft.customerId))
				?? (initialChat?.customer?.CODIGO === Number(draft.customerId) ? initialChat.customer : null)
			: null;
		setContextDraft(draft);
		setSelectedContextChat(initialChat);
		setChatSearchTerm(initialChat ? chatLabel(initialChat) : draft.chatId);
		setSelectedContextCustomer(initialCustomer);
		setCustomerSearchTerm(initialCustomer ? customerLabel(initialCustomer) : draft.customerId);
		setContextDialogOpen(true);
	}

	function applySuggestedContextToDraft() {
		if (!suggestedContext) return;
		const chat = chatOptions.find((entry) => entry.id === suggestedContext.chatId) ?? null;
		const customer = chat?.customer && chat.customer.CODIGO === suggestedContext.customerId ? chat.customer : null;
		setContextDraft((current) => ({
			...current,
			chatId: String(suggestedContext.chatId),
			customerId: suggestedContext.customerId ? String(suggestedContext.customerId) : current.customerId,
		}));
		setSelectedContextChat(chat);
		setChatSearchTerm(chat ? chatLabel(chat) : String(suggestedContext.chatId));
		if (customer) {
			setSelectedContextCustomer(customer);
			setCustomerOptions((current) => current.some((entry) => entry.CODIGO === customer.CODIGO) ? current : [customer, ...current]);
			setCustomerSearchTerm(customerLabel(customer));
		} else if (suggestedContext.customerId) {
			setSelectedContextCustomer(null);
			setCustomerSearchTerm(String(suggestedContext.customerId));
		}
	}

	function clearContextDraft() {
		setContextDraft(EMPTY_CONTEXT_DRAFT);
		setSelectedContextChat(null);
		setChatSearchTerm("");
		setSelectedContextCustomer(null);
		setCustomerSearchTerm("");
	}

	function addSuggestedContext() {
		if (!suggestedContext) return;
		setMessageContext((current) => ({ ...current, ...suggestedContext }));
	}

	function removeContextField(field: keyof SupervisorAiContextInput) {
		setMessageContext((current) => {
			const next = { ...current };
			delete next[field];
			return next;
		});
	}

	function removeContextArrayValue(field: "operatorIds" | "sectorIds", id: number) {
		setMessageContext((current) => {
			const remaining = (current[field] ?? []).filter((entry) => entry !== id);
			const next = { ...current };
			if (remaining.length > 0) next[field] = remaining;
			else delete next[field];
			return next;
		});
	}

	function removeContextPeriod() {
		setMessageContext((current) => {
			const next = { ...current };
			delete next.dateFrom;
			delete next.dateTo;
			return next;
		});
	}

	function saveContextDraft() {
		const chatId = contextDraft.chatId.trim() ? Number(contextDraft.chatId) : undefined;
		const customerId = contextDraft.customerId.trim() ? Number(contextDraft.customerId) : undefined;
		if ((chatId !== undefined && (!Number.isInteger(chatId) || chatId <= 0))
			|| (customerId !== undefined && (!Number.isInteger(customerId) || customerId <= 0))) {
			toast.error("Os IDs de chat e cliente devem ser números inteiros positivos.");
			return;
		}

		const dateFrom = contextDraft.dateFrom ? new Date(contextDraft.dateFrom) : null;
		const dateTo = contextDraft.dateTo ? new Date(contextDraft.dateTo) : null;
		if ((dateFrom && Number.isNaN(dateFrom.getTime())) || (dateTo && Number.isNaN(dateTo.getTime()))) {
			toast.error("Informe datas válidas para o período.");
			return;
		}
		if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
			toast.error("A data inicial deve ser anterior ou igual à data final.");
			return;
		}

		setMessageContext({
			...(chatId ? { chatId } : {}),
			...(customerId ? { customerId } : {}),
			...(dateFrom ? { dateFrom: dateFrom.toISOString() } : {}),
			...(dateTo ? { dateTo: dateTo.toISOString() } : {}),
			...(contextDraft.operatorIds.length > 0 ? { operatorIds: contextDraft.operatorIds.slice(0, 20) } : {}),
			...(contextDraft.sectorIds.length > 0 ? { sectorIds: contextDraft.sectorIds.slice(0, 20) } : {}),
			...(contextDraft.includeMetrics ? { includeMetrics: true } : {}),
		});
		setContextDialogOpen(false);
	}

	function canOpenSource(source: SupervisorAiSource): boolean {
		if (source.type === "metrics") return true;
		return typeof source.entityId === "number" && ["chat", "contact", "customer"].includes(source.type);
	}

	async function handleSourceClick(source: SupervisorAiSource) {
		if (!instance || !canOpenSource(source)) return;
		try {
			if (source.type === "chat" && source.entityId) {
				const loaded = await wppApi.current.getChatById(source.entityId);
				const loadedMessages = loaded.messages ?? [];
				const chat = {
					...loaded,
					chatType: "wpp" as const,
					isUnread: false,
					lastMessage: loadedMessages.at(-1) ?? null,
				} as DetailedChat;
				openChat(chat, loadedMessages);
				router.push(`/${instance}`);
				return;
			}

			if (source.type === "customer" && source.entityId) {
				openModal(
					<CustomerCrmDetailModal
						customerId={source.entityId}
						onClose={closeModal}
						canEdit={parameters["customer_detail_edit_enabled"] === "true"}
					/>,
				);
				return;
			}

			if (source.type === "contact") {
				router.push(`/${instance}/contacts`);
				return;
			}

			if (source.type === "metrics") {
				router.push(`/${instance}/reports/operators`);
			}
		} catch (error) {
			toast.error(`Não foi possível abrir a fonte: ${sanitizeErrorMessage(error)}`);
		}
	}

	async function handleActionDecision(action: SupervisorAiAction, decision: "CONFIRM" | "CANCEL") {
		if (typeof token !== "string" || sending) return;
		try {
			setDecidingActionId(action.id);
			const updated = await aiService.decideSupervisorAction(
				action.sessionId,
				action.id,
				{ decision },
				token,
			);
			setActions((current) => current.map((entry) => entry.id === updated.id ? updated : entry));

			if (updated.status === "EXECUTED") {
				toast.success("Chat de WhatsApp iniciado após sua confirmação.");
			} else if (updated.status === "CANCELLED") {
				toast.info("Ação cancelada e registrada na auditoria.");
			} else if (updated.status === "FAILED") {
				toast.error(updated.errorMessage || "Não foi possível executar a ação confirmada.");
			}
		} catch (error) {
			toast.error(`Falha ao registrar decisão: ${sanitizeErrorMessage(error)}`);
		} finally {
			setDecidingActionId(null);
		}
	}

	function handleFileAttach(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		if (files.length === 0) return;

		const remaining = MAX_FILES - attachedFiles.length;
		const toRead = files.slice(0, remaining);

		for (const file of toRead) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result;
				if (typeof content === "string") {
					setAttachedFiles((current) => [...current, { name: file.name, content: content.slice(0, 50_000) }]);
				}
			};
			reader.readAsText(file, "utf-8");
		}

		// Reset input so the same file can be re-attached if removed
		if (event.target) event.target.value = "";
	}

	function removeFile(index: number) {
		setAttachedFiles((current) => current.filter((_, i) => i !== index));
	}

	if (!canAccess) {
		return (
			<div className="p-8">
				<Alert severity="warning">Acesso restrito a administradores e supervisores.</Alert>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-black dark:bg-gray-900 dark:text-white">
			<div className="mx-auto grid min-h-0 flex-1 w-full max-w-[1480px] grid-cols-1 gap-3 overflow-hidden p-3 xl:grid-cols-[260px,minmax(0,1fr)]">

				{/* ── Sidebar ── */}
				<section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
					<div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
						<div className="flex items-center gap-2">
							<SmartToyOutlinedIcon fontSize="small" className="text-slate-400" />
							<Typography className="text-sm font-semibold text-slate-700 dark:text-slate-200">
								{showArchived ? "Arquivadas" : "Sessões"}
							</Typography>
							{loadingSessions && <CircularProgress size={13} />}
						</div>
						<div className="flex items-center gap-0.5">
							<Tooltip title={showArchived ? "Ver ativas" : "Ver arquivadas"}>
								<IconButton size="small" onClick={() => setShowArchived((v) => !v)} color={showArchived ? "primary" : "default"} disabled={sending}>
									<HistoryIcon fontSize="small" />
								</IconButton>
							</Tooltip>
							{!showArchived && (
								<Tooltip title="Nova sessão">
									<IconButton size="small" onClick={handleCreateSession} disabled={sending || changingMode}>
										<AddIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							)}
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						<List disablePadding dense>
							{sessions.map((session) => (
								<ListItemButton
									key={session.id}
									selected={session.id === selectedSession?.id}
									disabled={sending || changingMode}
									onClick={() => setSelectedSession(session)}
									sx={{
										mb: 0.5,
										pr: 1,
										borderRadius: "0.5rem",
										alignItems: "flex-start",
										border: "1px solid transparent",
										"&:hover": {
											backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.72)" : "rgb(241 245 249)",
											borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
											"& .archive-btn": { opacity: 1 },
										},
										"&.Mui-selected": {
											backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(15 23 42)" : "rgb(255 255 255)",
											borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
											boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
										},
										"&.Mui-selected:hover": {
											backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(15 23 42)" : "rgb(255 255 255)",
										},
									}}
								>
									<ListItemText
										primary={session.title}
										secondary={`${supervisorModeLabel(session.mode)} · ${session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString("pt-BR") : "Sem mensagens"}`}
										primaryTypographyProps={{ className: "text-sm font-medium text-slate-800 dark:text-slate-100 truncate" }}
										secondaryTypographyProps={{ className: "mt-0.5 text-xs text-slate-400 dark:text-slate-500" }}
									/>
									<Tooltip title={showArchived ? "Restaurar sessão" : "Arquivar sessão"}>
										<span>
											<IconButton
												size="small"
												className="archive-btn"
												sx={{ opacity: 0, flexShrink: 0, mt: 0.25, transition: "opacity 0.15s" }}
												onClick={(e) => void handleArchiveToggle(session, e)}
												disabled={archivingId === session.id || sending}
											>
												{archivingId === session.id
													? <CircularProgress size={14} />
													: showArchived
														? <UnarchiveOutlinedIcon fontSize="small" />
														: <ArchiveOutlinedIcon fontSize="small" />}
											</IconButton>
										</span>
									</Tooltip>
								</ListItemButton>
							))}
							{!loadingSessions && sessions.length === 0 && (
								<div className="px-3 py-5 text-sm text-slate-400 dark:text-slate-500">
									{showArchived ? "Nenhuma sessão arquivada." : "Nenhuma sessão ainda."}
								</div>
							)}
						</List>
					</div>
				</section>

				{/* ── Chat panel ── */}
				<section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

					{/* Chat header */}
					<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-2 dark:border-slate-700">
						<div className="flex min-w-0 items-center gap-2">
							<SmartToyOutlinedIcon fontSize="small" className="shrink-0 text-slate-400" />
							<Typography className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
								{selectedSession?.title ?? "Assistente"}
							</Typography>
							{loadingDetail && <CircularProgress size={14} className="shrink-0" />}
						</div>

						{/* Model selector */}
						<Stack direction="row" spacing={1} alignItems="center">
							<FormControl size="small" sx={{ minWidth: 125, flexShrink: 0 }}>
								<Select
									value={selectedMode}
									onChange={(event) => void handleModeChange(event.target.value as SupervisorAiChatMode)}
									disabled={sending || changingMode || showArchived}
									inputProps={{ "aria-label": "Modo do assistente" }}
									sx={{
										fontSize: "0.75rem",
										"& .MuiSelect-select": { py: 0.5, pr: "28px !important", pl: 1 },
									}}
								>
									{SUPERVISOR_MODES.map((mode) => (
										<MenuItem key={mode.value} value={mode.value} sx={{ fontSize: "0.75rem" }}>
											{mode.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 150, flexShrink: 0 }}>
								<Select
									value={selectedModel}
									onChange={(e) => setSelectedModel(e.target.value)}
									displayEmpty
									variant="outlined"
									sx={{
										fontSize: "0.75rem",
										"& .MuiSelect-select": { py: 0.5, pr: "28px !important", pl: 1 },
										"& .MuiOutlinedInput-notchedOutline": {
											borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
										},
									}}
								>
									{visibleModels.map((m) => (
										<MenuItem key={m.value} value={m.value} sx={{ fontSize: "0.75rem" }}>
											{m.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Stack>
					</div>

					<div className={`shrink-0 border-b border-slate-200 px-4 py-2 dark:border-slate-700 ${isReportsMode ? "bg-indigo-50/70 dark:bg-indigo-950/20" : ""}`}>
						<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
							<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{isReportsMode ? "Filtros do relatório:" : "Contexto ativo:"}
							</span>
							{messageContext.chatId && (
								<Chip size="small" color="info" variant="outlined" label={`Chat #${messageContext.chatId}`} onDelete={() => removeContextField("chatId")} />
							)}
							{messageContext.customerId && (
								<Chip size="small" color="info" variant="outlined" label={`Cliente #${messageContext.customerId}`} onDelete={() => removeContextField("customerId")} />
							)}
							{(messageContext.dateFrom || messageContext.dateTo) && (
								<Chip
									size="small"
									variant="outlined"
									label={`Período: ${messageContext.dateFrom ? new Date(messageContext.dateFrom).toLocaleDateString("pt-BR") : "início"} – ${messageContext.dateTo ? new Date(messageContext.dateTo).toLocaleDateString("pt-BR") : "hoje"}`}
									onDelete={removeContextPeriod}
								/>
							)}
							{messageContext.includeMetrics && (
								<Chip size="small" variant="outlined" label="Incluir métricas" onDelete={() => removeContextField("includeMetrics")} />
							)}
							{(messageContext.operatorIds ?? []).map((operatorId) => (
								<Chip
									key={`operator-${operatorId}`}
									size="small"
									variant="outlined"
									label={`Operador: ${operators.find((entry) => entry.CODIGO === operatorId)?.NOME ?? `#${operatorId}`}`}
									onDelete={() => removeContextArrayValue("operatorIds", operatorId)}
								/>
							))}
							{(messageContext.sectorIds ?? []).map((sectorId) => (
								<Chip
									key={`sector-${sectorId}`}
									size="small"
									variant="outlined"
									label={`Setor: ${sectors.find((entry) => entry.id === sectorId)?.name ?? `#${sectorId}`}`}
									onDelete={() => removeContextArrayValue("sectorIds", sectorId)}
								/>
							))}
							{!hasMessageContext && <span className="text-xs text-slate-400">Nenhum contexto selecionado.</span>}
							{suggestedContext && messageContext.chatId !== suggestedContext.chatId && (
								<Button size="small" onClick={addSuggestedContext} disabled={sending}>Usar chat aberto</Button>
							)}
							<Button size="small" variant="outlined" onClick={openContextDialog} disabled={sending || showArchived}>
								{hasMessageContext ? "Editar contexto" : "Adicionar contexto"}
							</Button>
							{hasMessageContext && (
								<Button size="small" color="inherit" onClick={() => setMessageContext({})} disabled={sending}>Limpar tudo</Button>
							)}
						</Stack>
					</div>

					{/* Messages */}
					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
						<Stack spacing={3}>
							{messages.map((entry) => (
								<div key={entry.id} className={entry.role === "USER" ? userBubbleClass : assistantBubbleClass}>
									{entry.role === "USER"
										? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{entry.content}</Typography>
										: <AssistantMarkdown content={entry.content} />}
									{entry.role === "ASSISTANT" && entry.metadata?.interrupted === true && (
										<Chip size="small" color="warning" variant="outlined" label="Resposta interrompida" className="mt-3" />
									)}
									{entry.metadata?.sources && Array.isArray(entry.metadata.sources) && entry.metadata.sources.length > 0 && (
										<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" className="mt-3">
											{entry.metadata.sources.map((source, index) => {
												const typedSource = source as SupervisorAiSource;
												const navigable = canOpenSource(typedSource);
												return (
													<Tooltip key={`${typedSource.type}-${typedSource.entityId ?? index}`} title={navigable ? "Abrir fonte" : "Fonte utilizada pela IA"}>
														<Chip
															size="small"
															variant="outlined"
															clickable={navigable}
															onClick={navigable ? () => void handleSourceClick(typedSource) : undefined}
															label={`${sourceLabel(typedSource.type)}: ${typedSource.label ?? "Sem rótulo"}`}
															sx={{
																backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(15 23 42)" : "rgb(255 255 255)",
																borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
																color: (theme) => theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(51 65 85)",
															}}
														/>
													</Tooltip>
												);
											})}
										</Stack>
									)}
									{entry.metadata?.reportPreview && (
										<ReportPreviewPanel preview={entry.metadata.reportPreview as SupervisorAiReportPreview} artifact={entry.metadata.reportArtifact} />
									)}
									{entry.role === "ASSISTANT" && actions
										.filter((action) => action.assistantMessageId === entry.id)
										.map((action) => (
											<SupervisorActionCard
												key={action.id}
												action={action}
												busy={decidingActionId === action.id}
												disabled={showArchived}
												onConfirm={() => setActionToConfirm(action)}
												onCancel={() => void handleActionDecision(action, "CANCEL")}
											/>
										))}
								</div>
							))}

							{sending && streamingQuestion && (
								<>
									<div className={userBubbleClass}>
										<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{streamingQuestion}</Typography>
									</div>
									<div className={assistantBubbleClass} aria-live="polite">
										{streamingContent
											? <AssistantMarkdown content={streamingContent} />
											: <span className="text-sm text-slate-400">Consultando dados e preparando a resposta…</span>}
										<span className="ml-1 inline-block h-4 w-1 animate-pulse bg-slate-400 align-middle" />
									</div>
								</>
							)}

							{!loadingDetail && !sending && selectedSession && messages.length === 0 && (
								<div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
									Envie a primeira pergunta para começar a conversa.
								</div>
							)}

							{!selectedSession && (
								<div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
									{showArchived
										? "Selecione uma sessão arquivada para visualizar."
										: "Crie ou selecione uma sessão para conversar com o assistente."}
								</div>
							)}

							<div ref={messagesEndRef} />
						</Stack>
					</div>

					{/* Composer */}
					<div className="shrink-0 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
						{selectedSession && !showArchived && (
							<Stack direction="row" spacing={1} useFlexGap className="mb-2 overflow-x-auto pb-1">
								{suggestions.map((suggestion) => (
									<Chip
										key={suggestion}
										size="small"
										variant="outlined"
										clickable
										disabled={sending}
										label={suggestion}
										onClick={() => setMessage(suggestion)}
										sx={{ flexShrink: 0, fontSize: "0.7rem" }}
									/>
								))}
							</Stack>
						)}
						{/* Attached file chips */}
						{attachedFiles.length > 0 && (
							<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" className="mb-2">
								{attachedFiles.map((file, i) => (
									<Chip
										key={i}
										label={file.name}
										size="small"
										variant="outlined"
										onDelete={() => removeFile(i)}
										deleteIcon={<CloseIcon />}
										sx={{
											fontSize: "0.7rem",
											borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
										}}
									/>
								))}
							</Stack>
						)}

						{/* Input row */}
						<Stack direction="row" spacing={1} alignItems="flex-end">
							<Tooltip title={attachedFiles.length >= MAX_FILES ? `Máximo de ${MAX_FILES} arquivos` : "Anexar arquivo de contexto (.txt, .md, .csv, .json)"}>
								<span>
									<IconButton
										size="small"
										onClick={() => fileInputRef.current?.click()}
										disabled={attachedFiles.length >= MAX_FILES || sending || showArchived}
										sx={{ mb: 0.5 }}
									>
										<AttachFileIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>

							<TextField
								fullWidth
								multiline
								minRows={1}
								maxRows={8}
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter" && !event.shiftKey) {
										event.preventDefault();
										void handleSendMessage();
									}
								}}
								placeholder={isReportsMode
									? "Descreva o relatório desejado, período e filtros..."
									: "Escreva sua pergunta... (Shift+Enter para nova linha)"}
								disabled={showArchived || sending}
								slotProps={{
									input: {
										endAdornment: (
											<InputAdornment position="end" sx={{ alignSelf: "flex-end", pb: 0.5 }}>
												<Tooltip title={sending ? "Interromper resposta" : "Enviar (Enter)"}>
													<span>
														<IconButton
															size="small"
															color={sending ? "error" : "primary"}
															onClick={sending ? handleStopStreaming : handleSendMessage}
															disabled={!sending && (!selectedSession || !message.trim() || showArchived)}
														>
															{sending
																? <StopCircleOutlinedIcon fontSize="small" />
																: <SendIcon fontSize="small" />}
														</IconButton>
													</span>
												</Tooltip>
											</InputAdornment>
										),
									},
								}}
								sx={{
									"& .MuiOutlinedInput-root": {
										backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(15 23 42)" : "rgb(255 255 255)",
										"& fieldset": {
											borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
										},
										"&:hover fieldset": {
											borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(71 85 105)" : "rgb(203 213 225)",
										},
									},
								}}
							/>
						</Stack>

						<input
							ref={fileInputRef}
							type="file"
							hidden
							accept={ACCEPTED_FILE_TYPES}
							multiple
							onChange={handleFileAttach}
						/>
					</div>
				</section>
			</div>

			<Dialog open={contextDialogOpen} onClose={() => setContextDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Gerenciar contexto</DialogTitle>
				<DialogContent>
					<p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
						Escolha os dados que acompanharão a próxima pergunta. Todos os campos são opcionais e podem ser removidos depois.
					</p>
					{suggestedContext && (
						<Button
							size="small"
							variant="outlined"
							className="mb-4"
							onClick={applySuggestedContextToDraft}
						>
							Adicionar chat e cliente atualmente abertos
						</Button>
					)}
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<Autocomplete
							value={selectedContextChat}
							inputValue={chatSearchTerm}
							options={chatOptions}
							loading={loadingChat}
							getOptionLabel={chatLabel}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							filterOptions={(options, state) => {
								const term = state.inputValue.trim().toLocaleLowerCase("pt-BR");
								if (!term) return options;
								const digits = term.replace(/\D/g, "");
								return options.filter((chat) => {
									const searchable = [
										String(chat.id),
										chat.contact?.name,
										chat.contact?.phone,
										chat.customer?.RAZAO,
										chat.customer?.FANTASIA,
										chat.userName,
									].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
									return searchable.includes(term)
										|| (digits.length > 0 && searchable.replace(/\D/g, "").includes(digits));
								});
							}}
							onInputChange={(_, value, reason) => {
								if (reason === "input" || reason === "clear") {
									setChatSearchTerm(value);
									if (reason === "clear" || (selectedContextChat && value !== chatLabel(selectedContextChat))) {
										setSelectedContextChat(null);
										setContextDraft((current) => ({ ...current, chatId: "" }));
									}
								}
							}}
							onChange={(_, value) => {
								setSelectedContextChat(value);
								setChatSearchTerm(value ? chatLabel(value) : "");
								setContextDraft((current) => ({ ...current, chatId: value ? String(value.id) : "" }));
							}}
							loadingText="Buscando conversa..."
							noOptionsText="Nenhuma conversa encontrada"
							renderInput={(params) => (
								<TextField
									{...params}
									label="Conversa do WhatsApp"
									size="small"
									placeholder="Nome, telefone ou número do chat"
								/>
							)}
						/>
						<Autocomplete
							value={selectedContextCustomer}
							inputValue={customerSearchTerm}
							options={customerOptions}
							loading={loadingCustomers}
							filterOptions={(options) => options}
							getOptionLabel={customerLabel}
							isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
							onInputChange={(_, value, reason) => {
								if (reason === "input" || reason === "clear") {
									setCustomerSearchTerm(value);
									if (reason === "clear" || (selectedContextCustomer && value !== customerLabel(selectedContextCustomer))) {
										setSelectedContextCustomer(null);
										setContextDraft((current) => ({ ...current, customerId: "" }));
									}
								}
							}}
							onChange={(_, value) => {
								setSelectedContextCustomer(value);
								setCustomerSearchTerm(value ? customerLabel(value) : "");
								setContextDraft((current) => ({ ...current, customerId: value ? String(value.CODIGO) : "" }));
							}}
							loadingText="Buscando clientes..."
							noOptionsText={customerSearchTerm.trim() ? "Nenhum cliente encontrado" : "Digite para buscar"}
							renderOption={(props, option) => {
								const { key, ...optionProps } = props;
								return (
									<li key={option.CODIGO} {...optionProps}>
										<div>
											<div>{customerLabel(option)}</div>
											<div className="text-xs text-slate-500">
												Código {option.CODIGO}{option.CPF_CNPJ ? ` · ${option.CPF_CNPJ}` : ""}
											</div>
										</div>
									</li>
								);
							}}
							renderInput={(params) => (
								<TextField
									{...params}
									label="Cliente"
									size="small"
									placeholder="Razão social ou código"
								/>
							)}
						/>
						<TextField
							label="Início do período"
							type="datetime-local"
							size="small"
							value={contextDraft.dateFrom}
							onChange={(event) => setContextDraft((current) => ({ ...current, dateFrom: event.target.value }))}
							slotProps={{ inputLabel: { shrink: true } }}
						/>
						<TextField
							label="Fim do período"
							type="datetime-local"
							size="small"
							value={contextDraft.dateTo}
							onChange={(event) => setContextDraft((current) => ({ ...current, dateTo: event.target.value }))}
							slotProps={{ inputLabel: { shrink: true } }}
						/>
						<FormControl size="small">
							<InputLabel id="context-operators-label">Operadores</InputLabel>
							<Select
								labelId="context-operators-label"
								label="Operadores"
								multiple
								value={contextDraft.operatorIds}
								onChange={(event) => {
									const value = event.target.value;
									setContextDraft((current) => ({
										...current,
										operatorIds: (typeof value === "string" ? value.split(",") : value).map(Number).slice(0, 20),
									}));
								}}
								renderValue={(selected) => `${selected.length} selecionado(s)`}
							>
								{operators.map((operator) => (
									<MenuItem key={operator.CODIGO} value={operator.CODIGO}>{operator.NOME}</MenuItem>
								))}
							</Select>
						</FormControl>
						<FormControl size="small">
							<InputLabel id="context-sectors-label">Setores</InputLabel>
							<Select
								labelId="context-sectors-label"
								label="Setores"
								multiple
								value={contextDraft.sectorIds}
								onChange={(event) => {
									const value = event.target.value;
									setContextDraft((current) => ({
										...current,
										sectorIds: (typeof value === "string" ? value.split(",") : value).map(Number).slice(0, 20),
									}));
								}}
								renderValue={(selected) => `${selected.length} selecionado(s)`}
							>
								{sectors.map((sector) => (
									<MenuItem key={sector.id} value={sector.id}>{sector.name}</MenuItem>
								))}
							</Select>
						</FormControl>
					</div>
					<div className="mt-3 flex items-center">
						<FormControlLabel
							control={(
								<Switch
									checked={contextDraft.includeMetrics}
									onChange={(event) => setContextDraft((current) => ({ ...current, includeMetrics: event.target.checked }))}
								/>
							)}
							label="Incluir métricas operacionais"
						/>
						<Tooltip title="Inclui dados do dashboard, como volume de mensagens e atendimentos, contatos aguardando retorno, transferências e tempos médios de primeira resposta e atendimento. O período, operadores e setores selecionados serão usados como filtros.">
							<IconButton size="small" aria-label="O que são métricas operacionais?">
								<InfoOutlinedIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</div>
				</DialogContent>
				<DialogActions>
					<Button onClick={clearContextDraft} color="inherit">Limpar formulário</Button>
					<Button onClick={() => setContextDialogOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={saveContextDraft}>Aplicar contexto</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={actionToConfirm !== null} onClose={() => setActionToConfirm(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Confirmar abertura do chat?</DialogTitle>
				<DialogContent>
					<p className="text-sm text-slate-700 dark:text-slate-200">
						O assistente solicita autorização para iniciar um chat de WhatsApp com:
					</p>
					<p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
						{actionToConfirm ? actionTarget(actionToConfirm) : ""}
					</p>
					<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
						A ação e sua decisão ficarão registradas na auditoria. Nenhuma mensagem será enviada automaticamente.
					</p>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setActionToConfirm(null)}>Voltar</Button>
					<Button
						variant="contained"
						onClick={() => {
							const action = actionToConfirm;
							setActionToConfirm(null);
							if (action) void handleActionDecision(action, "CONFIRM");
						}}
					>
						Confirmar e iniciar
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}

