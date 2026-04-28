"use client";

import { useAuthContext } from "@/app/auth-context";
import aiService from "@/lib/services/ai.service";
import type {
	SupervisorAiMessage,
	SupervisorAiSession,
	SupervisorAiSessionDetail,
} from "@/lib/types/sdk-local.types";
import { UserRole } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import {
	Alert,
	Button,
	Chip,
	CircularProgress,
	List,
	ListItemButton,
	ListItemText,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const pageShellClass = "box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white";
const pageGridClass = "mx-auto grid w-full max-w-[1480px] gap-6";
const cardClass = "rounded-md border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900";
const insetPanelClass = "rounded-md bg-slate-50 p-4 dark:bg-slate-800/40";
const assistantBubbleClass = "self-start max-w-[88%] rounded-2xl rounded-bl-none border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const userBubbleClass = "self-end max-w-[88%] rounded-2xl rounded-br-none bg-green-200 px-4 py-3 text-slate-800 shadow-sm dark:bg-green-800 dark:text-slate-100";

function sourceLabel(type: string) {
	switch (type) {
		case "action":
			return "Acao";
		case "chat":
			return "Chat";
		case "contact":
			return "Contato";
		case "customer":
			return "Cliente";
		case "metrics":
			return "Metricas";
		case "sql":
			return "SQL";
		default:
			return "Fonte";
	}
}

export default function AiSupervisorPage() {
	const { token, user } = useAuthContext();
	const userLevel = String(user?.NIVEL ?? "");
	const canAccess = userLevel === UserRole.ADMIN || userLevel === "SUPERVISOR";
	const [sessions, setSessions] = useState<SupervisorAiSession[]>([]);
	const [selectedSession, setSelectedSession] = useState<SupervisorAiSession | null>(null);
	const [messages, setMessages] = useState<SupervisorAiMessage[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [sending, setSending] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (typeof token !== "string" || !canAccess) {
			return;
		}

		const authToken = token;

		async function loadSessions() {
			try {
				setLoadingSessions(true);
				const data = await aiService.listSupervisorSessions(authToken);
				setSessions(data);
				if (data.length > 0) {
					setSelectedSession((current) => current ?? data[0]);
				}
			} catch (error) {
				toast.error(`Falha ao carregar sessoes: ${sanitizeErrorMessage(error)}`);
			} finally {
				setLoadingSessions(false);
			}
		}

		void loadSessions();
	}, [canAccess, token]);

	useEffect(() => {
		if (typeof token !== "string" || !selectedSession) {
			return;
		}

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

	async function handleCreateSession() {
		if (typeof token !== "string") {
			return;
		}

		try {
			const session = await aiService.createSupervisorSession(undefined, token);
			setSessions((current) => [session, ...current]);
			setSelectedSession(session);
			setMessages([]);
		} catch (error) {
			toast.error(`Falha ao criar sessao: ${sanitizeErrorMessage(error)}`);
		}
	}

	async function handleSendMessage() {
		if (typeof token !== "string" || !selectedSession || !message.trim()) {
			return;
		}

		try {
			setSending(true);
			const result = await aiService.sendSupervisorMessage(
				selectedSession.id,
				{ message: message.trim() },
				token,
			);

			setMessage("");
			setSelectedSession(result.session);
			setSessions((current) => {
				const next = current.filter((session) => session.id !== result.session.id);
				return [result.session, ...next];
			});
			setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
		} catch (error) {
			toast.error(`Falha ao enviar mensagem: ${sanitizeErrorMessage(error)}`);
		} finally {
			setSending(false);
		}
	}

	if (!canAccess) {
		return (
			<div className="p-8">
				<Alert severity="warning">Acesso restrito a administradores e supervisores.</Alert>
			</div>
		);
	}

	return (
		<div className={pageShellClass}>
			<div className={pageGridClass}>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
							<SmartToyOutlinedIcon />
						</div>
						<Typography variant="h4" fontWeight={700} className="text-slate-900 dark:text-slate-100">Assistente</Typography>
					</div>
					<Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateSession}>
						Nova sessao
					</Button>
				</div>

				<div className="grid min-h-[680px] gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
					<section className={`${cardClass} flex min-h-0 flex-col p-0`}>
						<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
							<div className="flex items-center gap-3">
								<div className="rounded-md bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
									<HistoryOutlinedIcon fontSize="small" />
								</div>
								<Typography className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sessoes</Typography>
							</div>
							{loadingSessions && <CircularProgress size={18} />}
						</div>

						<div className="min-h-0 flex-1 p-3">
							<div className={`${insetPanelClass} flex h-full min-h-0 flex-col p-2`}>
								<List className="min-h-0 flex-1 overflow-auto">
									{sessions.map((session) => (
										<ListItemButton
											key={session.id}
											selected={session.id === selectedSession?.id}
											onClick={() => setSelectedSession(session)}
											sx={{
												mb: 1,
												borderRadius: "0.5rem",
												alignItems: "flex-start",
												border: "1px solid transparent",
												"&:hover": {
													backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.72)" : "rgba(255,255,255,0.9)",
													borderColor: (theme) => theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
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
												primaryTypographyProps={{ className: "text-sm font-semibold text-slate-800 dark:text-slate-100" }}
												secondaryTypographyProps={{ className: "mt-1 text-xs text-slate-500 dark:text-slate-400" }}
											/>
										</ListItemButton>
									))}
									{!loadingSessions && sessions.length === 0 && (
										<div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
											Nenhuma sessao criada ainda.
										</div>
									)}
								</List>
							</div>
						</div>
					</section>

					<section className={`${cardClass} flex min-h-0 flex-col p-0`}>
						<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
							<div className="flex items-center gap-3">
								<div className="rounded-md bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
									<SmartToyOutlinedIcon fontSize="small" />
								</div>
								<Typography className="text-sm font-semibold text-slate-900 dark:text-slate-100">
									{selectedSession?.title ?? "Assistente"}
								</Typography>
							</div>
							{loadingDetail && <CircularProgress size={18} />}
						</div>

						<div className="min-h-0 flex-1 p-4">
							<div className={`${insetPanelClass} flex h-full min-h-0 flex-col p-4`}>
								<Stack className="min-h-0 flex-1 overflow-auto" spacing={2}>
									{messages.map((entry) => (
										<div key={entry.id} className={entry.role === "USER" ? userBubbleClass : assistantBubbleClass}>
											<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{entry.content}</Typography>
											{entry.metadata?.sources && Array.isArray(entry.metadata.sources) && entry.metadata.sources.length > 0 && (
												<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" className="mt-3">
													{entry.metadata.sources.map((source, index) => {
														const typedSource = source as {
															type?: string;
															label?: string;
															entityId?: number;
														};

														return (
															<Chip
																key={`${typedSource.type ?? "source"}-${typedSource.entityId ?? index}`}
																size="small"
																variant="outlined"
																label={`${sourceLabel(typedSource.type ?? "source")}: ${typedSource.label ?? "Sem rotulo"}`}
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
										<div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
											Envie a primeira pergunta para comecar a conversa com o assistente.
										</div>
									)}

									{!selectedSession && (
										<div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
											Crie ou selecione uma sessao para conversar com o assistente.
										</div>
									)}
								</Stack>
							</div>
						</div>

						<div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
							<div className={insetPanelClass}>
								<Stack spacing={2}>
									<TextField
										label="Mensagem"
										multiline
										minRows={4}
										value={message}
										onChange={(event) => setMessage(event.target.value)}
										placeholder="Escreva sua pergunta..."
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
									<div className="flex justify-end">
										<Button
											variant="contained"
											size="large"
											startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
											onClick={handleSendMessage}
											disabled={sending || !selectedSession || !message.trim()}
										>
											Enviar
										</Button>
									</div>
								</Stack>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}