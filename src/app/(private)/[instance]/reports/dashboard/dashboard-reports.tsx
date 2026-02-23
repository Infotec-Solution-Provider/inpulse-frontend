"use client";

import { useContext, useMemo } from "react";
import {
  AwaitingReturnRow,
  DashboardContext,
  MessagesPerContactRow,
  MessagesPerHourDayRow,
  MessagesPerUserRow,
  SatisfactionSurveyAnalyticalRow,
} from "./dashboard-context";
import DashboardReportCard from "./dashboard-report-card";
import { MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";
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

const weekDayLabel = (weekDay: number) => {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return labels[(weekDay - 1 + 7) % 7] || String(weekDay);
};

function EmptyState() {
  return <div className="text-sm text-slate-500">Sem dados para este relatório.</div>;
}

function MessagesPerUserTable({ data }: { data: MessagesPerUserRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-500">
          <th className="py-1">Operador</th>
          <th className="py-1">Mensagens</th>
          <th className="py-1">Enviadas</th>
          <th className="py-1">Recebidas</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.userId} className="border-t border-slate-100 dark:border-slate-800">
            <td className="py-1 pr-2 font-medium text-slate-700 dark:text-slate-200">
              {row.userName}
            </td>
            <td className="py-1">{row.messagesCount}</td>
            <td className="py-1">{row.sentMessagesCount}</td>
            <td className="py-1">{row.receivedMessagesCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MessagesPerContactTable({ data }: { data: MessagesPerContactRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-500">
          <th className="py-1">Contato</th>
          <th className="py-1">Cliente</th>
          <th className="py-1">Mensagens</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.contactId} className="border-t border-slate-100 dark:border-slate-800">
            <td className="py-1 pr-2 font-medium text-slate-700 dark:text-slate-200">
              {row.contactName}
            </td>
            <td className="py-1 pr-2">{row.customerName || "-"}</td>
            <td className="py-1">{row.messagesCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MessagesPerHourDayTable({ data }: { data: MessagesPerHourDayRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-500">
          <th className="py-1">Setor</th>
          <th className="py-1">Dia</th>
          <th className="py-1">Hora</th>
          <th className="py-1">Mensagens</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={`${row.sector}-${row.weekDay}-${row.hour}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
            <td className="py-1 pr-2 font-medium text-slate-700 dark:text-slate-200">
              {row.sector || "-"}
            </td>
            <td className="py-1">{weekDayLabel(row.weekDay)}</td>
            <td className="py-1">{row.hour}h</td>
            <td className="py-1">{row.messagesCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AwaitingReturnTable({ data }: { data: AwaitingReturnRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-500">
          <th className="py-1">Contato</th>
          <th className="py-1">Cliente</th>
          <th className="py-1">Setor</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.CODIGO_ATENDIMENTO} className="border-t border-slate-100 dark:border-slate-800">
            <td className="py-1 pr-2 font-medium text-slate-700 dark:text-slate-200">
              {row.CONTATO}
            </td>
            <td className="py-1 pr-2">{row.CLIENTE || "-"}</td>
            <td className="py-1">{row.SETOR || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SatisfactionSurveyAnalyticalTable({ data }: { data: SatisfactionSurveyAnalyticalRow[] }) {
  if (!data.length) return <EmptyState />;
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-500">
          <th className="py-1">Chat</th>
          <th className="py-1">Operador</th>
          <th className="py-1">Cliente</th>
          <th className="py-1">Q1</th>
          <th className="py-1">Q2</th>
          <th className="py-1">Q3</th>
          <th className="py-1">Q4</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.chatId} className="border-t border-slate-100 dark:border-slate-800">
            <td className="py-1 pr-2 font-medium text-slate-700 dark:text-slate-200">{row.chatId}</td>
            <td className="py-1 pr-2">{row.operatorName || row.operatorId || "-"}</td>
            <td className="py-1 pr-2">{row.customerName || row.contactName || "-"}</td>
            <td className="py-1">{row.answers.q1?.rating ?? "-"}</td>
            <td className="py-1">{row.answers.q2?.rating ?? "-"}</td>
            <td className="py-1">{row.answers.q3?.rating ?? "-"}</td>
            <td className="py-1">{row.answers.q4?.rating ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DashboardReports() {
  const {
    chartTypes,
    setChartType,
    selectedReport,
    setSelectedReport,
    loading,
    contactsAwaitingReturn,
    messagesPerUser,
    messagesPerContact,
    messagesPerHourDay,
    satisfactionSurveyAnalytical,
    satisfactionSurveySynthetic,
  } = useContext(DashboardContext);

  const messagesPerUserChartData = useMemo(() => {
    return messagesPerUser.map((row) => ({
      name: row.userName,
      messages: row.messagesCount,
      sent: row.sentMessagesCount,
      received: row.receivedMessagesCount,
    }));
  }, [messagesPerUser]);

  const topContacts = useMemo(() => {
    return [...messagesPerContact]
      .sort((a, b) => b.messagesCount - a.messagesCount)
      .slice(0, 10);
  }, [messagesPerContact]);

  const hourAggregation = useMemo(() => {
    const map = new Map<number, { hour: number; messages: number; sent: number; received: number }>();
    messagesPerHourDay.forEach((row) => {
      const entry = map.get(row.hour) || { hour: row.hour, messages: 0, sent: 0, received: 0 };
      entry.messages += row.messagesCount;
      entry.sent += row.sentMessagesCount;
      entry.received += row.receivedMessagesCount;
      map.set(row.hour, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.hour - b.hour);
  }, [messagesPerHourDay]);

  const awaitingBySector = useMemo(() => {
    const map = new Map<string, number>();
    contactsAwaitingReturn.forEach((row) => {
      const sector = row.SETOR || "Sem setor";
      map.set(sector, (map.get(sector) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [contactsAwaitingReturn]);

  const satisfactionByQuestion = useMemo(() => {
    return satisfactionSurveySynthetic.map((row) => ({
      name: row.questionLabel,
      average: row.averageScore || 0,
      total: row.totalAnswers,
    }));
  }, [satisfactionSurveySynthetic]);

  const exportToCsv = (filename: string, rows: Record<string, any>[]) => {
    if (!rows.length) {
      toast.info("Sem dados para exportar.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => {
      const stringValue = value == null ? "" : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };
    const csv = [headers.join(";"), ...rows.map((row) => headers.map((h) => escape(row[h])).join(";"))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const chartHeight = 410;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <TextField
          select
          label="Relatório"
          size="small"
          value={selectedReport}
          onChange={(e) =>
            setSelectedReport(
              e.target.value as
                | "messagesPerUser"
                | "messagesPerContact"
                | "messagesPerHourDay"
                | "contactsAwaitingReturn"
                | "satisfactionSurvey",
            )
          }
          className="min-w-[240px]"
        >
          <MenuItem value="messagesPerUser">Mensagens por Operador</MenuItem>
          <MenuItem value="messagesPerContact">Mensagens por Contato</MenuItem>
          <MenuItem value="messagesPerHourDay">Mensagens por Hora e Dia</MenuItem>
          <MenuItem value="contactsAwaitingReturn">Contatos aguardando retorno</MenuItem>
          <MenuItem value="satisfactionSurvey">Pesquisa de Satisfação (Exatron)</MenuItem>
        </TextField>
      </div>

      {selectedReport === "messagesPerUser" && (
        <DashboardReportCard
          title="Mensagens por Operador"
          description="Total de mensagens, enviadas e recebidas por operador."
          isLoading={loading}
          onExport={() => exportToCsv("mensagens-por-operador.csv", messagesPerUser)}
          chartType={chartTypes.messagesPerUser}
          onChartTypeChange={(type) => setChartType("messagesPerUser", type)}
          chart={
            messagesPerUserChartData.length ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartTypes.messagesPerUser === "pie" ? (
                  <PieChart>
                    <Pie data={messagesPerUserChartData} dataKey="messages" nameKey="name" outerRadius={90}>
                      {messagesPerUserChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : chartTypes.messagesPerUser === "line" ? (
                  <LineChart data={messagesPerUserChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="messages" stroke="#6366f1" />
                  </LineChart>
                ) : (
                  <BarChart data={messagesPerUserChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#06b6d4" name="Enviadas" />
                    <Bar dataKey="received" fill="#6366f1" name="Recebidas" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )
          }
          table={<MessagesPerUserTable data={messagesPerUser} />}
        />
      )}

      {selectedReport === "messagesPerContact" && (
        <DashboardReportCard
          title="Mensagens por Contato"
          description="Top 10 contatos com maior volume de mensagens."
          isLoading={loading}
          onExport={() => exportToCsv("mensagens-por-contato.csv", messagesPerContact)}
          chartType={chartTypes.messagesPerContact}
          onChartTypeChange={(type) => setChartType("messagesPerContact", type)}
          chart={
            topContacts.length ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartTypes.messagesPerContact === "pie" ? (
                  <PieChart>
                    <Pie data={topContacts} dataKey="messagesCount" nameKey="contactName" outerRadius={90}>
                      {topContacts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : chartTypes.messagesPerContact === "line" ? (
                  <LineChart data={topContacts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="contactName" hide />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="messagesCount" stroke="#6366f1" />
                  </LineChart>
                ) : (
                  <BarChart data={topContacts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="contactName" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="messagesCount" fill="#6366f1" name="Mensagens" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )
          }
          table={<MessagesPerContactTable data={messagesPerContact.slice(0, 20)} />}
        />
      )}

      {selectedReport === "messagesPerHourDay" && (
        <DashboardReportCard
          title="Mensagens por Hora e Dia"
          description="Distribuição de mensagens por horário e dia da semana."
          isLoading={loading}
          onExport={() => exportToCsv("mensagens-por-hora-dia.csv", messagesPerHourDay)}
          chartType={chartTypes.messagesPerHourDay}
          onChartTypeChange={(type) => setChartType("messagesPerHourDay", type)}
          chart={
            hourAggregation.length ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartTypes.messagesPerHourDay === "pie" ? (
                  <PieChart>
                    <Pie data={hourAggregation} dataKey="messages" nameKey="hour" outerRadius={90}>
                      {hourAggregation.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Mensagens"]} />
                  </PieChart>
                ) : chartTypes.messagesPerHourDay === "bar" ? (
                  <BarChart data={hourAggregation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#06b6d4" name="Enviadas" />
                    <Bar dataKey="received" fill="#6366f1" name="Recebidas" />
                  </BarChart>
                ) : (
                  <LineChart data={hourAggregation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="#06b6d4" name="Enviadas" />
                    <Line type="monotone" dataKey="received" stroke="#6366f1" name="Recebidas" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )
          }
          table={<MessagesPerHourDayTable data={messagesPerHourDay.slice(0, 20)} />}
        />
      )}

      {selectedReport === "contactsAwaitingReturn" && (
        <DashboardReportCard
          title="Contatos aguardando retorno"
          description="Conversas com mensagem do cliente sem resposta do operador."
          isLoading={loading}
          onExport={() => exportToCsv("contatos-aguardando-retorno.csv", contactsAwaitingReturn)}
          chartType={chartTypes.contactsAwaitingReturn}
          onChartTypeChange={(type) => setChartType("contactsAwaitingReturn", type)}
          chart={
            awaitingBySector.length ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartTypes.contactsAwaitingReturn === "bar" ? (
                  <BarChart data={awaitingBySector}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" name="Pendências" />
                  </BarChart>
                ) : chartTypes.contactsAwaitingReturn === "line" ? (
                  <LineChart data={awaitingBySector}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#f97316" name="Pendências" />
                  </LineChart>
              ) : (
                <PieChart>
                  <Pie data={awaitingBySector} dataKey="value" nameKey="name" outerRadius={90}>
                    {awaitingBySector.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              )}
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )
          }
          table={<AwaitingReturnTable data={contactsAwaitingReturn.slice(0, 20)} />}
        />
      )}

      {selectedReport === "satisfactionSurvey" && (
        <DashboardReportCard
          title="Pesquisa de Satisfação (Exatron)"
          description="Visão sintética por pergunta e visão analítica por pesquisa."
          isLoading={loading}
          onExport={() =>
            exportToCsv(
              "pesquisa-satisfacao-analitico.csv",
              satisfactionSurveyAnalytical.map((row) => ({
                chatId: row.chatId,
                operatorId: row.operatorId,
                operatorName: row.operatorName,
                contactName: row.contactName,
                contactPhone: row.contactPhone,
                customerId: row.customerId,
                customerName: row.customerName,
                customerCnpj: row.customerCnpj,
                startedAt: row.startedAt,
                finishedAt: row.finishedAt,
                q1: row.answers.q1?.rating,
                q2: row.answers.q2?.rating,
                q3: row.answers.q3?.rating,
                q4: row.answers.q4?.rating,
              })),
            )
          }
          chartType={chartTypes.satisfactionSurvey}
          onChartTypeChange={(type) => setChartType("satisfactionSurvey", type)}
          chart={
            satisfactionByQuestion.length ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                {chartTypes.satisfactionSurvey === "pie" ? (
                  <PieChart>
                    <Pie data={satisfactionByQuestion} dataKey="average" nameKey="name" outerRadius={90}>
                      {satisfactionByQuestion.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Média"]} />
                  </PieChart>
                ) : chartTypes.satisfactionSurvey === "line" ? (
                  <LineChart data={satisfactionByQuestion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#6366f1" name="Média da nota" />
                  </LineChart>
                ) : (
                  <BarChart data={satisfactionByQuestion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#6366f1" name="Média da nota" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )
          }
          table={<SatisfactionSurveyAnalyticalTable data={satisfactionSurveyAnalytical.slice(0, 50)} />}
        />
      )}
    </div>
  );
}
