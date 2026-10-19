import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { canAccessInternalGroups, isExternalOperator } from "@/lib/permissions/operator-access";
import { UserRole } from "@/lib/sdk-local";

export interface NavigationRoute {
  title: string;
  href: string;
}
export type NavigationIcon =
  | "headset"
  | "monitor"
  | "channels"
  | "records"
  | "pipelines"
  | "ai"
  | "campaign"
  | "reports"
  | "news";
export interface NavigationItem {
  title: string;
  icon: NavigationIcon;
  href?: string;
  routes?: NavigationRoute[];
}

export const crudsRoutes = (
  params: Record<string, string>,
  isAdmin: boolean,
  role: UserRole | null | undefined,
) => {
  const isExternal = isExternalOperator(role);
  const arr: { title: string; href: string }[] = [];

  if (!isExternal) {
    arr.push({ title: "Clientes", href: "/customers" });
  }

  if (isAdmin) {
    arr.push({ title: "Clientes · Segmentos", href: "/customer-segments" });
    arr.push({ title: "Parâmetros", href: "/parameters" });
    arr.push({ title: "Usuários", href: "/users" });
    if (isFeatureEnabled(params, FEATURE_FLAGS.sipConfig)) {
      arr.push({ title: "Configuração SIP", href: "/sip-config" });
    }
    arr.push({ title: "Mensagens prontas", href: "/ready-messages" });
    arr.push({ title: "Resposta automática", href: "/auto-response" });
    arr.push({ title: "Identificar remetentes", href: "/whatsapp-senders" });
    arr.push({ title: "Solicitações de contatos", href: "/contact-requests" });
  }

  if (canAccessInternalGroups(params, role)) {
    arr.push({ title: "Grupos Internos", href: "/internal-groups" });
  }

  if (!isExternal && params["disable_contacts_crud"] !== "true") {
    arr.push({ title: "Contatos", href: "/contacts" });
  }

  return arr;
};

export const aiRoutes = (params: Record<string, string>) => {
  if (!isFeatureEnabled(params, FEATURE_FLAGS.ai)) {
    return [];
  }

  return [
    ...(isFeatureEnabled(params, FEATURE_FLAGS.aiSupervisor)
      ? [{ title: "Assistente", href: "/ai-supervisor" }]
      : []),
    ...(isFeatureEnabled(params, FEATURE_FLAGS.aiAgents)
      ? [{ title: "Agentes", href: "/ai-agents" }]
      : []),
    ...(isFeatureEnabled(params, FEATURE_FLAGS.aiSettings)
      ? [{ title: "Configurações IA", href: "/ai-settings" }]
      : []),
  ];
};

export const reportsRoutes = (params: Record<string, string>, instance: string) => {
  const routes = [{ title: "Relatórios", href: "/reports/dashboard" }];
  if (isFeatureEnabled(params, FEATURE_FLAGS.chatExport)) {
    routes.push({ title: "Conversas", href: "/reports/chats" });
  }

  if (isFeatureEnabled(params, FEATURE_FLAGS.reportsAdvanced)) {
    routes.push(
      { title: "Dashboard de Operadores", href: "/reports/operators" },
      { title: "Metas e Indicadores", href: "/reports/goals-dashboard" },
      { title: "Equipe x Metas", href: "/reports/team-goals" },
      { title: "Origem x Qualidade", href: "/reports/lead-origin-quality" },
      { title: "Motivos de Perda", href: "/reports/lost-reasons" },
      { title: "Performance Operadores", href: "/reports/operator-performance" },

      //{ title: "Análise de Mailing", href: "/reports/mailing-analysis" },
      //{ title: "Régua por Carteira (Sintético) + WhatsApp", href: "/reports/regua-carteira-sintetico-whatsapp" },
    );
  }

  if (instance === "exatron") {
    routes.push({
      title: "Pesquisa de Satisfação",
      href: "/reports/dashboard?report=satisfactionSurvey",
    });
  }

  if (isFeatureEnabled(params, FEATURE_FLAGS.salesReports)) {
    routes.push(
      { title: "Dashboard: Vendas", href: "/reports/sales" },
      { title: "Dashboard: WhatsApp", href: "/reports/operator-performance" },
    );
  }

  /*   if (isFeatureEnabled(params, FEATURE_FLAGS.reportsDashboards)) {
    routes.push(
      //{ title: "Gerador de Relatório", href: "/reports/report-generator" },
      //{ title: "Dashboards", href: "/reports/dashboards" },
      //{ title: "Métricas", href: "/reports/metrics" },
    );
  } */

  return routes;
};

/** One permission-aware catalog used by the pilot and legacy navigation. */
export function getNavigationItems(
  parameters: Record<string, string>,
  role: UserRole | null | undefined,
  instance: string,
): NavigationItem[] {
  const isAdmin = role === UserRole.ADMIN;
  const crud = crudsRoutes(parameters, isAdmin, role);
  const ai = aiRoutes(parameters);
  const items: NavigationItem[] = [{ title: "Área de Atendimento", href: "/", icon: "headset" }];
  if (isAdmin) items.push({ title: "Monitoria", href: "/monitor", icon: "monitor" });
  if (isAdmin && isFeatureEnabled(parameters, FEATURE_FLAGS.whatsappSessionMonitoring)) {
    items.push({ title: "Canais WhatsApp", href: "/channels", icon: "channels" });
  }
  if (crud.length) items.push({ title: "Cadastros", routes: crud, icon: "records" });
  if (isAdmin && !isExternalOperator(role) && isFeatureEnabled(parameters, FEATURE_FLAGS.funnels)) {
    items.push({ title: "Pipelines", href: "/funnel", icon: "pipelines" });
  }
  if (isAdmin && ai.length) items.push({ title: "IA", routes: ai, icon: "ai" });
  if (isAdmin && isFeatureEnabled(parameters, FEATURE_FLAGS.massMessages)) {
    items.push({ title: "Disparos", href: "/tools/mass-messages", icon: "campaign" });
  }
  if (isAdmin) {
    items.push({
      title: "Relatórios",
      routes: reportsRoutes(parameters, instance),
      icon: "reports",
    });
    items.push({ title: "Novidades", href: "/changelog", icon: "news" });
  }
  return items;
}

export function isMonitorPath(pathname: string): boolean {
  return pathname.split("?")[0].split("/").filter(Boolean)[1] === "monitor";
}

export function isNavigationRouteActive(pathname: string, instance: string, href: string): boolean {
  const current = pathname.split("?")[0].replace(/\/$/, "");
  const route = `/${instance}${href.split("?")[0]}`.replace(/\/$/, "");
  return current === route || (href !== "/" && current.startsWith(`${route}/`));
}

export function sidebarStorageKey(instance: string, userId: number | string): string {
  return `@inpulse/ui/sidebar:v1:${encodeURIComponent(instance)}:${encodeURIComponent(String(userId))}`;
}

export function sidebarExpandedPreference(saved: string | null, viewportWidth: number): boolean {
  if (saved === "expanded") return true;
  if (saved === "compact") return false;
  return viewportWidth >= 1280;
}
