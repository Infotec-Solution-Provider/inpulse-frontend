"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import {
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Skeleton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AuthContext } from "@/app/auth-context";
import financialService, { OperatorSaleDetail } from "@/lib/services/financial.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { useFinancialContext } from "./financial-context";

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
});

interface Props {
	operadorId: number | null;
	operadorNome: string | null;
	onClose: () => void;
}

export default function OperatorDetailModal({ operadorId, operadorNome, onClose }: Props) {
	const { token } = useContext(AuthContext);
	const { filters } = useFinancialContext();
	const [rows, setRows] = useState<OperatorSaleDetail[]>([]);
	const [loading, setLoading] = useState(false);

	const open = true;

	const load = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const data = await financialService.getOperatorSales(token, {
				startDate: filters.startDate,
				endDate: filters.endDate,
				operadorId,
				...(filters.situacao !== undefined && { situacao: filters.situacao }),
			});
			setRows(data);
		} catch (err) {
			toast.error(sanitizeErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [token, operadorId, filters.startDate, filters.endDate, filters.situacao]);

	useEffect(() => {
		if (open) {
			setRows([]);
			void load();
		}
	}, [open, load]);

	const totalFat = rows.reduce((sum, r) => sum + r.valor, 0);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle className="flex items-center justify-between pr-2">
				<span>
					Vendas de{" "}
					<span className="font-bold">{operadorNome ?? (operadorId !== null ? `#${operadorId}` : "Outros")}</span>
					<span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
						{filters.startDate} → {filters.endDate}
					</span>
				</span>
				<IconButton size="small" onClick={onClose}>
					<CloseIcon fontSize="small" />
				</IconButton>
			</DialogTitle>

			<DialogContent dividers className="p-0">
				{loading ? (
					<div className="flex items-center justify-center py-16">
						<CircularProgress size={32} />
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
									<th className="px-4 py-3">#</th>
									<th className="px-4 py-3">Data</th>
									<th className="px-4 py-3">Cliente</th>
									<th className="px-4 py-3">Tipo</th>
									<th className="px-4 py-3">Forma Pgto</th>
									<th className="px-4 py-3">Situação</th>
									<th className="px-4 py-3 text-right">Valor</th>
								</tr>
							</thead>
							<tbody>
								{loading
									? Array.from({ length: 8 }).map((_, i) => (
											<tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
												{Array.from({ length: 7 }).map((__, j) => (
													<td key={j} className="px-4 py-3">
														<Skeleton variant="text" />
													</td>
												))}
											</tr>
										))
									: rows.map((row) => (
											<tr
												key={row.codigo}
												className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/30"
											>
												<td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.codigo}</td>
												<td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.data}</td>
												<td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
													{row.clienteNome ?? (row.clienteId !== null ? `#${row.clienteId}` : "—")}
												</td>
												<td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.tipo ?? "—"}</td>
												<td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.formaPgto ?? "—"}</td>
												<td className="px-4 py-3">
													{row.situacao ? (
														<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
															{row.situacao}
														</span>
													) : (
														"—"
													)}
												</td>
												<td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-200">
													{BRL.format(row.valor)}
												</td>
											</tr>
										))}

								{!loading && rows.length === 0 && (
									<tr>
										<td
											colSpan={7}
											className="py-10 text-center text-sm text-slate-500 dark:text-slate-400"
										>
											Nenhuma venda encontrada no período
										</td>
									</tr>
								)}
							</tbody>
							{rows.length > 0 && (
								<tfoot>
									<tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800">
										<td
											colSpan={6}
											className="px-4 py-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-300"
										>
											Total ({rows.length} vendas)
										</td>
										<td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 dark:text-emerald-400">
											{BRL.format(totalFat)}
										</td>
									</tr>
								</tfoot>
							)}
						</table>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
