"use client";

import { useState, type ReactNode } from "react";
import { Button, MenuItem, TablePagination, TextField, useTheme } from "@mui/material";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { normalizeReportSearch } from "@/lib/reports/catalog";

export interface ResultColumn {
  label: string;
  numeric?: boolean;
}

export interface ResultRow {
  key: string | number;
  cells: ReactNode[];
  search: string;
}

export function ReportResultTable({
  columns,
  rows,
  searchHint,
  exportDisabled,
  onExport,
}: {
  columns: ResultColumn[];
  rows: ResultRow[];
  searchHint: string;
  exportDisabled: boolean;
  onExport: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const terms = normalizeReportSearch(search).split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? rows.filter((row) => {
        const text = normalizeReportSearch(row.search);
        return terms.every((term) => text.includes(term));
      })
    : rows;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));

  return (
    <section
      className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5"
      aria-label="Resultados do relatório"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Resultados</h2>
        <Button
          variant="outlined"
          startIcon={<Download size={16} />}
          disabled={exportDisabled}
          onClick={onExport}
        >
          Exportar CSV
        </Button>
      </div>
      <TextField
        size="small"
        label="Pesquisar nos resultados"
        placeholder={searchHint}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
      />
      <p className="text-xs text-slate-500 dark:text-slate-400" role="status">
        {filtered.length} de {rows.length} registros. O CSV inclui todo o resultado.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={
                    column.numeric
                      ? "whitespace-nowrap px-3 py-3 text-right"
                      : "whitespace-nowrap px-3 py-3"
                  }
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((row) => (
              <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800">
                {row.cells.map((value, index) => (
                  <td
                    key={columns[index].label}
                    className={
                      columns[index].numeric ? "px-3 py-3 text-right tabular-nums" : "px-3 py-3"
                    }
                  >
                    {typeof value === "number" ? value.toLocaleString("pt-BR") : (value ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nenhum registro corresponde à pesquisa.
        </p>
      )}
      <TablePagination
        component="div"
        count={filtered.length}
        page={currentPage}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, next) => setPage(next)}
        onRowsPerPageChange={(event) => {
          setPageSize(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        getItemAriaLabel={(type) =>
          ({
            first: "Primeira página",
            previous: "Página anterior",
            next: "Próxima página",
            last: "Última página",
          })[type]
        }
        sx={{
          ".MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: "flex-end", pl: 0 },
          ".MuiTablePagination-spacer": { display: "none" },
        }}
      />
    </section>
  );
}

export type ReportChartType = "bar" | "line" | "pie";
export interface ReportChartPoint {
  label: string;
  total: number;
  sent?: number;
  received?: number;
}

export function ReportResultChart({
  title,
  points,
  initialType = "bar",
  directions = false,
  metric,
  note,
  hideXAxis = false,
}: {
  title: string;
  points: ReportChartPoint[];
  initialType?: ReportChartType;
  directions?: boolean;
  hideXAxis?: boolean;
  metric: string;
  note?: string;
}) {
  const [type, setType] = useState(initialType);
  const theme = useTheme();
  const colors = ["#6366f1", "#0891b2", "#d97706", "#059669", "#e11d48"];
  // Recharts v2 discovers axes and series among direct children, including arrays.
  const axes = [
    <CartesianGrid key="grid" strokeDasharray="3 3" stroke={theme.palette.divider} />,
    <XAxis
      key="x"
      dataKey="label"
      hide={hideXAxis}
      tick={{ fill: theme.palette.text.secondary }}
    />,
    <YAxis key="y" allowDecimals={false} tick={{ fill: theme.palette.text.secondary }} />,
    <Tooltip
      key="tooltip"
      contentStyle={{
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
      }}
    />,
  ];
  const series = directions
    ? [
        { key: "sent", label: "Enviadas", color: colors[1] },
        { key: "received", label: "Recebidas", color: colors[0] },
      ]
    : [{ key: "total", label: metric, color: colors[0] }];
  return (
    <section
      className="grid min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5"
      aria-label={title}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <TextField
          select
          size="small"
          label="Tipo de gráfico"
          value={type}
          onChange={(event) => setType(event.target.value as ReportChartType)}
          sx={{ minWidth: 152 }}
        >
          <MenuItem value="bar">Barras</MenuItem>
          <MenuItem value="line">Linha</MenuItem>
          <MenuItem value="pie">Pizza</MenuItem>
        </TextField>
      </div>
      <div className="h-80 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie data={points} dataKey="total" nameKey="label" outerRadius={100}>
                {points.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                }}
              />
            </PieChart>
          ) : type === "line" ? (
            <LineChart data={points}>
              {axes}
              {directions && <Legend />}
              {series.map((item) => (
                <Line key={item.key} dataKey={item.key} name={item.label} stroke={item.color} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={points}>
              {axes}
              {directions && <Legend />}
              {series.map((item) => (
                <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {note && <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>}
    </section>
  );
}
