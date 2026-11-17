"use client";

import { Fragment, useMemo, useState } from "react";
import {
  IconButton,
  LinearProgress,
  Skeleton,
  Tooltip,
  TextField,
  TablePagination,
} from "@mui/material";
import { downloadReportCsv } from "@/lib/reports/filters";
import { normalizeReportSearch } from "@/lib/reports/catalog";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useFinancialContext } from "./financial-context";
import OperatorDetailModal from "./operator-detail-modal";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function exportCsv(rows: ReturnType<typeof useRows>) {
  downloadReportCsv(
    "vendas-por-operador.csv",
    ["Operador", "Vendas", "Faturamento", "Ticket Médio", "Prop. Convertidas", "% Conversão"],
    rows.map((row) => [
      row.operadorNome ?? row.operadorId ?? "Sem operador",
      row.totalCompras,
      row.totalFaturamento.toFixed(2),
      row.ticketMedio.toFixed(2),
      row.propostasConvertidas,
      row.totalCompras > 0 ? ((row.propostasConvertidas / row.totalCompras) * 100).toFixed(1) : "0",
    ]),
  );
}

function useRows() {
  const { data } = useFinancialContext();
  return useMemo(() => {
    const all = [...(data?.byOperator ?? [])].sort(
      (a, b) => b.totalFaturamento - a.totalFaturamento,
    );
    const named = all.filter((r) => r.operadorId !== null);
    const others = all.filter((r) => r.operadorId === null);
    return [...named, ...others];
  }, [data]);
}

export default function ByOperatorTable() {
  const { data, isLoading } = useFinancialContext();
  const allRows = useRows();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const rows = allRows.filter((row) =>
    normalizeReportSearch(`${row.operadorNome ?? "Outros"} ${row.operadorId ?? ""}`).includes(
      normalizeReportSearch(search),
    ),
  );
  const actualPage = Math.min(page, Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1));
  const [detail, setDetail] = useState<{ id: number | null; nome: string | null } | null>(null);

  const operatorGoals = useMemo(() => {
    const map = new Map<
      number,
      { targetRevenue: number | null; targetSalesCount: number | null }
    >();
    for (const g of data?.meta.operators ?? []) {
      const prev = map.get(g.operadorId);
      map.set(g.operadorId, {
        targetRevenue: (prev?.targetRevenue ?? 0) + (g.targetRevenue ?? 0),
        targetSalesCount: (prev?.targetSalesCount ?? 0) + (g.targetSalesCount ?? 0),
      });
    }
    return map;
  }, [data]);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            Desempenho por Operador
          </h2>
          {allRows.length > 0 && (
            <Tooltip title="Exportar CSV">
              <IconButton
                size="small"
                aria-label="Exportar CSV de vendas por operador"
                onClick={() => exportCsv(allRows)}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>

        <TextField
          size="small"
          label="Pesquisar operadores no resultado"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
        <p className="my-3 text-xs text-slate-500">
          {rows.length} de {allRows.length} operadores no resultado. A pesquisa abrange todos os
          registros carregados. O CSV inclui o resultado completo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="pb-3 pr-4">Operador</th>
                <th className="pb-3 pr-4 text-right">Vendas</th>
                <th className="pb-3 pr-4 text-right">Faturamento</th>
                <th className="pb-3 pr-4 text-right">Ticket Médio</th>
                <th className="pb-3 pr-4 text-right">Prop.</th>
                <th className="pb-3 pr-4 text-right">% Conv.</th>
                <th className="pb-3">Meta (Fat.)</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="py-3 pr-4">
                          <Skeleton variant="text" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows
                    .slice(actualPage * rowsPerPage, (actualPage + 1) * rowsPerPage)
                    .map((row, idx) => {
                      const isOthers = row.operadorId === null;
                      const position = actualPage * rowsPerPage + idx;
                      const rank = allRows.indexOf(row);
                      const isFirstOthers =
                        isOthers && (position === 0 || rows[position - 1]?.operadorId !== null);

                      const goal = !isOthers ? operatorGoals.get(row.operadorId!) : undefined;
                      const pct =
                        goal?.targetRevenue && goal.targetRevenue > 0
                          ? (row.totalFaturamento / goal.targetRevenue) * 100
                          : null;
                      const convPct =
                        row.totalCompras > 0
                          ? (row.propostasConvertidas / row.totalCompras) * 100
                          : 0;

                      const medal =
                        !isOthers &&
                        (rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null);

                      return (
                        <Fragment key={row.operadorId ?? "sem-op"}>
                          {isFirstOthers && (
                            <tr key="outros-separator">
                              <td colSpan={8} className="px-0 pb-0 pt-1">
                                <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
                              </td>
                            </tr>
                          )}
                          <tr
                            key={row.operadorId ?? "sem-op"}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/30"
                          >
                            <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">
                              {medal ? <span className="mr-1">{medal}</span> : null}
                              {row.operadorNome ??
                                (row.operadorId !== null ? `#${row.operadorId}` : "Outros")}
                            </td>
                            <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-400">
                              {row.totalCompras}
                            </td>
                            <td className="py-3 pr-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {BRL.format(row.totalFaturamento)}
                            </td>
                            <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-400">
                              {BRL.format(row.ticketMedio)}
                            </td>
                            <td className="py-3 pr-4 text-right text-slate-600 dark:text-slate-400">
                              {row.propostasConvertidas}
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <span
                                className={`text-xs font-semibold ${convPct >= 50 ? "text-emerald-600" : convPct >= 25 ? "text-amber-500" : "text-slate-500"}`}
                              >
                                {convPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="min-w-[160px] py-3">
                              {pct !== null ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span
                                      className={
                                        pct >= 100
                                          ? "font-semibold text-emerald-600 dark:text-emerald-400"
                                          : ""
                                      }
                                    >
                                      {pct.toFixed(1)}%
                                    </span>
                                    <span>{BRL.format(goal!.targetRevenue!)}</span>
                                  </div>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, pct)}
                                    color={pct >= 100 ? "success" : pct >= 70 ? "warning" : "error"}
                                    className="rounded-full"
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 pl-2">
                              <Tooltip title="Ver vendas">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setDetail({ id: row.operadorId, nome: row.operadorNome })
                                  }
                                >
                                  <OpenInNewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Sem dados para o período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          component="div"
          count={rows.length}
          page={actualPage}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, next) => setPage(next)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          labelRowsPerPage="Por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{
            ".MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end", pl: 0 },
            ".MuiTablePagination-spacer": { display: "none" },
          }}
        />
      </div>

      {detail !== null && (
        <OperatorDetailModal
          operadorId={detail.id}
          operadorNome={detail.nome}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
