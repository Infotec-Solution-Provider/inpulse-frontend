"use client";

import aiService from "@/lib/services/ai.service";
import type { AiOpenAiKeyStatus } from "@/lib/types/sdk-local.types";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
	Alert,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from "@mui/material";
import { useState } from "react";
import { toast } from "react-toastify";
import { dialogPaperSx } from "../../monitor/surface";

const KEY_PATTERN = /^sk-[A-Za-z0-9_-]{16,300}$/;

function formatDateTime(iso: string | null) {
	if (!iso) return null;
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Chave da OpenAI da empresa. A chave digitada vai direto para o ai-service, que
 * confere na OpenAI e guarda cifrada; ela nunca volta para o navegador (só o final).
 */
export default function OpenAiKeyPanel({
	instance,
	token,
	status,
	onChange,
}: {
	instance: string;
	token: string;
	status: AiOpenAiKeyStatus | null;
	onChange: (status: AiOpenAiKeyStatus) => void;
}) {
	const [apiKey, setApiKey] = useState("");
	const [saving, setSaving] = useState(false);
	const [confirmRemove, setConfirmRemove] = useState(false);
	const [removing, setRemoving] = useState(false);

	const trimmed = apiKey.trim();
	const formatOk = KEY_PATTERN.test(trimmed);
	const storageAvailable = status?.storageAvailable !== false;
	const hasTenantKey = status?.source === "tenant" || status?.unreadable === true;
	const updatedAt = formatDateTime(status?.updatedAt ?? null);

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		if (!formatOk) return;
		try {
			setSaving(true);
			const next = await aiService.setOpenAiKey(instance, trimmed, token);
			onChange(next);
			setApiKey("");
			toast.success("Chave da OpenAI conferida e salva.");
		} catch (error) {
			toast.error(sanitizeErrorMessage(error));
		} finally {
			setSaving(false);
		}
	}

	async function handleRemove() {
		try {
			setRemoving(true);
			const next = await aiService.clearOpenAiKey(instance, token);
			onChange(next);
			setConfirmRemove(false);
			toast.success("Chave da OpenAI removida.");
		} catch (error) {
			toast.error(sanitizeErrorMessage(error));
		} finally {
			setRemoving(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{!storageAvailable && (
				<Alert severity="error">
					O servidor ainda não está preparado para guardar chaves da OpenAI. Avise o suporte da Infotec.
				</Alert>
			)}

			{status?.unreadable ? (
				<Alert severity="warning">
					A chave salva não pode mais ser lida. Cadastre a chave novamente para voltar a usar a IA.
				</Alert>
			) : status?.source === "tenant" ? (
				<div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
					<CheckCircleIcon fontSize="small" />
					<span>
						Chave cadastrada, terminando em <strong className="font-mono">••••{status.last4}</strong>
						{updatedAt ? ` · atualizada em ${updatedAt}` : ""}
					</span>
				</div>
			) : status?.source === "environment" ? (
				<Alert severity="info">
					A empresa está usando a chave global do servidor. Cadastre a chave da empresa para usar a sua conta e o seu limite de gasto na OpenAI.
				</Alert>
			) : (
				<Alert severity="warning">
					Nenhuma chave cadastrada: as funcionalidades de IA ficam indisponíveis até o cadastro.
				</Alert>
			)}

			<form onSubmit={handleSave} className="flex flex-col gap-3 sm:flex-row sm:items-start">
				<div className="w-full max-w-xl">
					<TextField
						label={hasTenantKey ? "Nova chave (substitui a atual)" : "Chave da OpenAI"}
						type="password"
						size="small"
						fullWidth
						autoComplete="off"
						value={apiKey}
						onChange={(event) => setApiKey(event.target.value)}
						placeholder="sk-..."
						disabled={!storageAvailable || saving}
						error={trimmed.length > 0 && !formatOk}
						helperText={
							trimmed.length > 0 && !formatOk
								? "A chave começa com sk- e não tem espaços."
								: "Gere a chave em platform.openai.com (API keys). Ela é conferida na OpenAI antes de ser salva."
						}
						inputProps={{ spellCheck: false, "data-lpignore": "true" }}
					/>
				</div>
				<div className="flex gap-2">
					<Button
						type="submit"
						variant="contained"
						disabled={!storageAvailable || saving || !formatOk}
						startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
					>
						{saving ? "Conferindo..." : "Salvar chave"}
					</Button>
					{hasTenantKey && (
						<Button color="error" variant="outlined" disabled={saving || removing} onClick={() => setConfirmRemove(true)}>
							Remover
						</Button>
					)}
				</div>
			</form>

			<Dialog
				open={confirmRemove}
				onClose={removing ? undefined : () => setConfirmRemove(false)}
				maxWidth="xs"
				fullWidth
				slotProps={{ paper: { sx: dialogPaperSx } }}
			>
				<DialogTitle className="text-slate-900 dark:text-slate-100">Remover a chave da OpenAI?</DialogTitle>
				<DialogContent>
					<p className="text-sm text-slate-600 dark:text-slate-300">
						Sem a chave, o copiloto, o Assistente e os agentes de IA desta empresa param de responder até uma nova chave ser cadastrada.
					</p>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmRemove(false)} disabled={removing}>
						Cancelar
					</Button>
					<Button color="error" variant="contained" onClick={() => void handleRemove()} disabled={removing}>
						{removing ? "Removendo..." : "Remover chave"}
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}
