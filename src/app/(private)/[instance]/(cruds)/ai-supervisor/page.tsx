"use client";

import { useAuthContext } from "@/app/auth-context";
import AssistantMarkdown from "@/lib/components/assistant-markdown";
import aiService from "@/lib/services/ai.service";
import type {
	SupervisorAiMessage,
	SupervisorAiSession,
	SupervisorAiSessionDetail,
} from "@/lib/types/sdk-local.types";
import { UserRole } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import AddIcon from "@mui/icons-material/Add";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import SendIcon from "@mui/icons-material/Send";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import {
	Alert,
	Chip,
	CircularProgress,
	FormControl,
	IconButton,
	InputAdornment,
	List,
	ListItemButton,
	ListItemText,
	MenuItem,
	Select,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const assistantBubbleClass = "self-start max-w-[88%] rounded-2xl rounded-bl-none border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const userBubbleClass = "self-end max-w-[88%] rounded-2xl rounded-br-none bg-green-200 px-4 py-3 text-slate-800 shadow-sm dark:bg-green-800 dark:text-slate-100";

const AVAILABLE_MODELS = [
	{ value: "", label: "Padrão do tenant" },
	{ value: "gpt-4o-mini", label: "GPT-4o Mini" },
	{ value: "gpt-4o", label: "GPT-4o" },
	{ value: "gpt-4-turbo", label: "GPT-4 Turbo" },
	{ value: "o1-mini", label: "o1 Mini" },
	{ value: "o3-mini", label: "o3 Mini" },
	{ value: "o4-mini", label: "o4 Mini" },
];

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.log";
const MAX_FILES = 3;

function sourceLabel(type: string) {
	switch (type) {
		case "action": return "Ação";
		case "chat": return "Chat";
		case "contact": return "Contato";
		case "customer": return "Cliente";
		case "metrics": return "Métricas";
		case "sql": return "SQL";
		default: return "Fonte";
	}
}

export default function AiSupervisorPage() {
	const { token, user } = useAuthContext();
	const userLevel = String(user?.NIVEL ?? "");
	const canAccess = userLevel === UserRole.ADMIN || userLevel === "SUPERVISOR";

	// Sessions state
	const [sessions, setSessions] = useState<SupervisorAiSession[]>([]);
	const [selectedSession, setSelectedSession] = useState<SupervisorAiSession | null>(null);
	const [messages, setMessages] = useState<SupervisorAiMessage[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [showArchived, setShowArchived] = useState(false);
	const [archivingId, setArchivingId] = useState<number | null>(null);

	// Composer state
	const [sending, setSending] = useState(false);
	const [message, setMessage] = useState("");
	const [selectedModel, setSelectedModel] = useState("");
	const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; content: string }>>([]);

	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

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
	}, [messages.length, selectedSession?.id]);

	async function handleCreateSession() {
		if (typeof token !== "string") return;
		try {
			const session = await aiService.createSupervisorSession(undefined, token);
			setSessions((current) => [session, ...current]);
			setSelectedSession(session);
			setMessages([]);
			if (showArchived) setShowArchived(false);
		} catch (error) {
			toast.error(`Falha ao criar sessão: ${sanitizeErrorMessage(error)}`);
		}
	}

	async function handleArchiveToggle(session: SupervisorAiSession, event: React.MouseEvent) {
		event.stopPropagation();
		if (typeof token !== "string") return;
		const nextStatus = session.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
		try {
			setArchivingId(session.id);
			await aiService.patchSupervisorSessionStatus(session.id, nextStatus, token);
			setSessions((current) => current.filter((s) => s.id !== session.id));
			if (selectedSession?.id === session.id) {
				setSelectedSession(null);
				setMessages([]);
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
		if (typeof token !== "string" || !selectedSession || !message.trim()) return;
		try {
			setSending(true);
			const result = await aiService.sendSupervisorMessage(
				selectedSession.id,
				{
					message: message.trim(),
					...(selectedModel ? { model: selectedModel } : {}),
					...(attachedFiles.length > 0 ? { fileContext: attachedFiles } : {}),
				},
				token,
			);
			setMessage("");
			setAttachedFiles([]);
			setSelectedSession(result.session);
			setSessions((current) => {
				const next = current.filter((s) => s.id !== result.session.id);
				return [result.session, ...next];
			});
			setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
		} catch (error) {
			toast.error(`Falha ao enviar mensagem: ${sanitizeErrorMessage(error)}`);
		} finally {
			setSending(false);
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
								<IconButton size="small" onClick={() => setShowArchived((v) => !v)} color={showArchived ? "primary" : "default"}>
									<HistoryIcon fontSize="small" />
								</IconButton>
							</Tooltip>
							{!showArchived && (
								<Tooltip title="Nova sessão">
									<IconButton size="small" onClick={handleCreateSession}>
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
										secondary={session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString("pt-BR") : "Sem mensagens"}
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
												disabled={archivingId === session.id}
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
								{AVAILABLE_MODELS.map((m) => (
									<MenuItem key={m.value} value={m.value} sx={{ fontSize: "0.75rem" }}>
										{m.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</div>

					{/* Messages */}
					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
						<Stack spacing={3}>
							{messages.map((entry) => (
								<div key={entry.id} className={entry.role === "USER" ? userBubbleClass : assistantBubbleClass}>
									{entry.role === "USER"
										? <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{entry.content}</Typography>
										: <AssistantMarkdown content={entry.content} />}
									{entry.metadata?.sources && Array.isArray(entry.metadata.sources) && entry.metadata.sources.length > 0 && (
										<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" className="mt-3">
											{entry.metadata.sources.map((source, index) => {
												const typedSource = source as { type?: string; label?: string; entityId?: number };
												return (
													<Chip
														key={`${typedSource.type ?? "source"}-${typedSource.entityId ?? index}`}
														size="small"
														variant="outlined"
														label={`${sourceLabel(typedSource.type ?? "source")}: ${typedSource.label ?? "Sem rótulo"}`}
														sx={{
															backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgb(15 23 42)" : "rgb(255 255 255)",
															borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
															color: (theme) => theme.palette.mode === "dark" ? "rgb(226 232 240)" : "rgb(51 65 85)",
														}}
													/>
												);
											})}
										</Stack>
									)}
								</div>
							))}

							{!loadingDetail && selectedSession && messages.length === 0 && (
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
								placeholder="Escreva sua pergunta... (Shift+Enter para nova linha)"
								disabled={showArchived}
								slotProps={{
									input: {
										endAdornment: (
											<InputAdornment position="end" sx={{ alignSelf: "flex-end", pb: 0.5 }}>
												<Tooltip title={sending ? "Aguardando resposta..." : "Enviar (Enter)"}>
													<span>
														<IconButton
															size="small"
															color="primary"
															onClick={handleSendMessage}
															disabled={sending || !selectedSession || !message.trim() || showArchived}
														>
															{sending
																? <CircularProgress size={18} color="inherit" />
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
		</div>
	);
}

