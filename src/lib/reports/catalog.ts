import { attendanceReportPaths } from "./attendance-routes";
import { FEATURE_FLAGS as F, isFeatureEnabled } from "@/lib/feature-flags";
import { UserRole } from "@/lib/sdk-local";

export const REPORT_CATEGORIES = [
  { id: "attendance", title: "Atendimento e WhatsApp" },
  { id: "commercial", title: "Comercial" },
  { id: "quality", title: "Qualidade" },
  { id: "portfolios", title: "Carteiras e campanhas" },
  { id: "personalized", title: "Personalizados" },
] as const;

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  category: (typeof REPORT_CATEGORIES)[number]["id"];
  href: string;
  keywords: string[];
  output: "Tabela e gráfico" | "Painel" | "Arquivo";
  feature?: (typeof F)[keyof typeof F];
  instance?: string;
}

export const REPORT_CATALOG: readonly ReportDefinition[] = [
  {
    id: "messages-per-user",
    title: "Mensagens por Operador",
    description: "Volume de mensagens enviadas e recebidas por operador no período.",
    category: "attendance",
    href: "/reports/messages-per-operator",
    keywords: ["whatsapp", "produtividade", "usuário"],
    output: "Tabela e gráfico",
  },
  {
    id: "messages-per-contact",
    title: "Mensagens por Contato",
    description: "Distribuição de mensagens entre contatos e clientes.",
    category: "attendance",
    href: `/reports/${attendanceReportPaths.messagesPerContact}`,
    keywords: ["whatsapp", "cliente"],
    output: "Tabela e gráfico",
  },
  {
    id: "messages-per-hour",
    title: "Mensagens por Hora e Dia",
    description: "Horários e dias da semana com maior volume de mensagens.",
    category: "attendance",
    href: `/reports/${attendanceReportPaths.messagesPerHourDay}`,
    keywords: ["whatsapp", "horário", "setor"],
    output: "Tabela e gráfico",
  },
  {
    id: "awaiting-return",
    title: "Contatos aguardando retorno",
    description: "Posição atual das conversas que aguardam uma resposta do operador.",
    category: "attendance",
    href: `/reports/${attendanceReportPaths.contactsAwaitingReturn}`,
    keywords: ["pendência", "resposta", "whatsapp"],
    output: "Tabela e gráfico",
  },
  {
    id: "call-abc",
    title: "Curva ABC de ligações",
    description: "Classifique clientes e campanhas pelo volume de ligações, contatos ou vendas no período.",
    category: "attendance",
    href: "/reports/call-abc",
    keywords: ["g29", "telefonia", "ranking", "receptivo", "ativo"],
    output: "Tabela e gráfico",
    feature: F.reportsAdvanced,
  },
  {
    id: "general-performance",
    title: "Performance Geral",
    description: "Indicadores consolidados de atendimento e desempenho da equipe.",
    category: "attendance",
    href: "/reports/general-performance",
    keywords: ["whatsapp", "equipe"],
    output: "Painel",
  },
  {
    id: "operators",
    title: "Dashboard de Operadores",
    description: "Desempenho, detalhamento de atendimentos e agenda por operador.",
    category: "attendance",
    href: "/reports/operators",
    keywords: ["whatsapp", "agenda", "equipe"],
    output: "Painel",
    feature: F.reportsAdvanced,
  },
  {
    id: "operator-performance",
    title: "Performance por Operador",
    description: "Desempenho individual com comparação entre períodos.",
    category: "attendance",
    href: "/reports/operator-performance",
    keywords: ["dashboard whatsapp", "performance operadores", "produtividade"],
    output: "Painel",
    feature: F.reportsAdvanced,
  },
  {
    id: "chats",
    title: "Exportação de Conversas",
    description: "Gere um arquivo de conversas e acompanhe seu processamento.",
    category: "attendance",
    href: "/reports/chats",
    keywords: ["histórico", "mensagens", "pdf", "csv", "txt"],
    output: "Arquivo",
    feature: F.chatExport,
  },
  {
    id: "sales",
    title: "Vendas",
    description: "Faturamento, vendas, metas e comparação com o período anterior.",
    category: "commercial",
    href: "/reports/sales",
    keywords: ["dashboard financeiro", "receita", "faturamento"],
    output: "Painel",
    feature: F.salesReports,
  },
  {
    id: "goals",
    title: "Metas e Indicadores",
    description: "Realizado financeiro, metas mensais e ritmo do período.",
    category: "commercial",
    href: "/reports/goals-dashboard",
    keywords: ["financeiro", "receita"],
    output: "Painel",
    feature: F.reportsAdvanced,
  },
  {
    id: "team-goals",
    title: "Equipe x Metas",
    description: "Compare os resultados de cada operador com suas metas.",
    category: "commercial",
    href: "/reports/team-goals",
    keywords: ["operador", "financeiro"],
    output: "Painel",
    feature: F.reportsAdvanced,
  },
  {
    id: "lead-quality",
    title: "Origem x Qualidade",
    description: "Origens dos leads, conversão comercial e faturamento.",
    category: "commercial",
    href: "/reports/lead-origin-quality",
    keywords: ["lead", "origem", "conversão"],
    output: "Painel",
    feature: F.reportsAdvanced,
  },
  {
    id: "lost-reasons",
    title: "Motivos de Perda",
    description: "Encerramentos sem avanço comercial e seus motivos.",
    category: "commercial",
    href: "/reports/lost-reasons",
    keywords: ["resultado", "encerramento", "conversão"],
    output: "Painel",
    feature: F.reportsAdvanced,
  },
  {
    id: "satisfaction",
    title: "Pesquisa de Satisfação",
    description: "Respostas individuais e indicadores da pesquisa de satisfação.",
    category: "quality",
    href: "/reports/satisfaction",
    keywords: ["exatron", "qualidade", "avaliação"],
    output: "Painel",
    instance: "exatron",
  },
  {
    id: "mailing-analysis",
    title: "Análise de Mailing",
    description: "Cobertura da base, contatos por canal e resultados das carteiras.",
    category: "portfolios",
    href: "/reports/mailing-analysis",
    keywords: ["campanha", "clientes contatados", "base"],
    output: "Tabela e gráfico",
    feature: F.reportsAdvanced,
  },
  {
    id: "portfolio-journey",
    title: "Régua por Carteira",
    description: "Aproveitamento e conversão por carteira ou operador.",
    category: "portfolios",
    href: "/reports/regua-carteira-sintetico-whatsapp",
    keywords: ["régua", "sintético", "analítico", "whatsapp"],
    output: "Tabela e gráfico",
    feature: F.reportsAdvanced,
  },
  {
    id: "generated",
    title: "Relatórios personalizados",
    description: "Relatórios salvos pela equipe e seus rascunhos privados.",
    category: "personalized",
    href: "/reports/generated",
    keywords: ["salvos", "rascunhos"],
    output: "Painel",
    feature: F.reportsDashboards,
  },
  {
    id: "dashboards",
    title: "Painéis personalizados",
    description: "Consulte e organize os painéis de métricas da equipe.",
    category: "personalized",
    href: "/reports/dashboards",
    keywords: ["dashboard", "indicadores", "métricas"],
    output: "Painel",
    feature: F.reportsDashboards,
  },
];

export function normalizeReportSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function availableReports(
  parameters: Record<string, string>,
  role: UserRole | null | undefined,
  instance: string,
) {
  if (role !== UserRole.ADMIN) return [];
  return REPORT_CATALOG.filter(
    (report) =>
      (!report.feature || isFeatureEnabled(parameters, report.feature)) &&
      (!report.instance || report.instance === instance),
  );
}

export function searchReports(
  reports: readonly ReportDefinition[],
  query: string,
  category = "all",
) {
  const terms = normalizeReportSearch(query).split(/\s+/).filter(Boolean);
  return reports.filter((report) => {
    const categoryTitle =
      REPORT_CATEGORIES.find((item) => item.id === report.category)?.title ?? "";
    const text = normalizeReportSearch(
      [report.title, report.description, categoryTitle, ...report.keywords].join(" "),
    );
    return (
      (category === "all" || report.category === category) &&
      terms.every((term) => text.includes(term))
    );
  });
}
