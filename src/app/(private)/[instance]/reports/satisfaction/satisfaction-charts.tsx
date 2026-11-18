"use client";

import { MenuItem, TextField } from "@mui/material";
import type { SatisfactionSurveySyntheticRow } from "../dashboard/dashboard-context";
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

const CHART_COLORS = ["#6366f1", "#06b6d4", "#f97316", "#10b981", "#f43f5e", "#a855f7"];
const EmptyState = () => <p className="text-sm text-slate-500">Sem respostas no período.</p>;

export function SatisfactionSurveySyntheticView({
  synthetic,
  chartType,
  onChartTypeChange,
}: {
  synthetic: SatisfactionSurveySyntheticRow[];
  chartType: "bar" | "pie" | "line";
  onChartTypeChange: (type: "bar" | "pie" | "line") => void;
}) {
  const DIST_COLORS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
  ];

  const averageData = synthetic.map((row) => ({
    name: row.questionLabel,
    average: row.averageScore || 0,
    total: row.totalAnswers,
  }));

  const chartHeight = 320;

  return (
    <div className="grid gap-6">
      {/* Average per question */}
      <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nota Média por Pergunta
          </h4>
          <TextField
            select
            size="small"
            label="Gráfico"
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as "bar" | "pie" | "line")}
            className="min-w-[130px]"
          >
            <MenuItem value="bar">Barras</MenuItem>
            <MenuItem value="pie">Pizza</MenuItem>
            <MenuItem value="line">Linha</MenuItem>
          </TextField>
        </div>
        {averageData.length ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            {chartType === "pie" ? (
              <PieChart>
                <Pie data={averageData} dataKey="average" nameKey="name" outerRadius={90}>
                  {averageData.map((_, index) => (
                    <Cell key={`avg-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toFixed(2), "Média"]} />
              </PieChart>
            ) : chartType === "line" ? (
              <LineChart data={averageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average" stroke="#6366f1" name="Média" />
              </LineChart>
            ) : (
              <BarChart data={averageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#6366f1" name="Média" />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Distribution per question */}
      <div className="grid gap-4 lg:grid-cols-2">
        {synthetic.map((row) => (
          <div key={row.questionKey} className="rounded-md bg-slate-50 p-4 dark:bg-slate-800/40">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {row.questionKey.toUpperCase()}: {row.questionLabel}
              </h4>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                {row.totalAnswers} resposta(s)
              </span>
            </div>
            {row.distribution.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={row.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="score"
                    tick={{ fontSize: 11 }}
                    label={{ value: "Nota", position: "insideBottom", offset: -2, fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [value, "Respostas"]}
                    labelFormatter={(label) => `Nota ${label}`}
                  />
                  <Bar dataKey="count" name="Respostas">
                    {row.distribution.map((entry, idx) => (
                      <Cell key={`dist-${idx}`} fill={DIST_COLORS[Math.min(entry.score - 1, 9)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Sem dados</div>
            )}
            {row.averageScore != null && (
              <div className="mt-1 text-right text-xs text-slate-500">
                Média:{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {row.averageScore.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
