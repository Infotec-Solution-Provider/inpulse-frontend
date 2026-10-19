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
interface NavigationBase {
  id: string;
  title: string;
  icon?: NavigationIcon;
}
export type NavigationItem = NavigationBase &
  (
    | { kind: "link"; href: string; aliases?: string[]; routes?: never }
    | { kind: "group"; routes: NavigationItem[]; href?: never }
  );

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
    arr.push({ title: "Clientes · Cadastros auxiliares", href: "/crm-catalogs" });
    arr.push({ title: "Clientes · Segmentos", href: "/customer-segments" });
    arr.push({ title: "Parâmetros", href: "/parameters" });
    arr.push({ title: "Usuários", href: "/users" });
    arr.push({ title: "Usuários · Cadastros auxiliares", href: "/user-catalogs" });
    arr.push({ title: "Usuários · Lançamentos de vendas", href: "/crm-purchases" });
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
  const ai = aiRoutes(parameters);
  const link = (id: string, title: string, href: string, aliases?: string[]): NavigationItem => ({
    id,
    title,
    href,
    aliases,
    kind: "link",
  });
  const group = (
    id: string,
    title: string,
    routes: NavigationItem[],
    icon: NavigationIcon = "records",
  ): NavigationItem => ({ id, title, routes, icon, kind: "group" });
  const items: NavigationItem[] = [
    { ...link("attendance", "Área de Atendimento", "/"), icon: "headset" },
  ];
  if (isAdmin) items.push({ ...link("monitor", "Monitoria", "/monitor"), icon: "monitor" });
  if (!isExternalOperator(role)) {
    items.push(
      group("customers", "Clientes", [
        link("customers-register", "Cadastro", "/customers", ["/crm-customers"]),
        ...(isAdmin
          ? [
              link("customer-groups", "Grupos", "/crm-catalogs/customer-groups"),
              link("segments", "Segmentos", "/customer-segments"),
              link("positions", "Cargos", "/crm-catalogs/positions"),
              link("origins", "Origens", "/crm-catalogs/origins"),
              link("brands", "Marcas", "/crm-catalogs/brands"),
            ]
          : []),
      ]),
    );
  }
  if (isAdmin) {
    items.push(
      group("users", "Usuários", [
        link("users-register", "Cadastro", "/users"),
        link("user-groups", "Grupos", "/user-catalogs/user-groups"),
        link("shifts", "Expedientes", "/user-catalogs/shifts"),
        link("pauses", "Motivos de pausa", "/user-catalogs/pause-reasons"),
        group("sales", "Vendas", [
          link("purchases", "Lançamentos", "/crm-purchases"),
          link("sales-types", "Catálogo de vendas", "/user-catalogs/sales-types"),
        ]),
      ]),
    );
    items.push(
      group(
        "campaigns",
        "Campanhas CRM",
        [
          link("campaigns-register", "Cadastro", "/crm-campaigns"),
          link("results", "Resultados", "/crm-results"),
          link("ordering", "Ordenação", "/crm-ordering"),
          group("exceptions", "Exceções", [
            link("exception-cities", "Cidades", "/crm-exceptions?kind=cities"),
            link("exception-customers", "Clientes", "/crm-exceptions?kind=customers"),
            link("exception-states", "Estados", "/crm-exceptions?kind=states"),
            link("exception-segments", "Segmentos", "/crm-exceptions?kind=segments"),
          ]),
        ],
        "campaign",
      ),
    );
    items.push(
      group("general", "Cadastros gerais", [
        link("cities", "Cidades", "/crm-catalogs/cities"),
        link("states", "Estados", "/crm-catalogs/states"),
        link("medias", "Mídias", "/crm-catalogs/medias"),
      ]),
    );
  }
  const communication: NavigationItem[] = [];
  if (!isExternalOperator(role) && parameters.disable_contacts_crud !== "true")
    communication.push(link("contacts", "Contatos", "/contacts"));
  if (canAccessInternalGroups(parameters, role))
    communication.push(link("internal-groups", "Grupos internos", "/internal-groups"));
  if (isAdmin)
    communication.push(
      link("ready-messages", "Mensagens prontas", "/ready-messages"),
      link("auto-response", "Resposta automática", "/auto-response"),
      link("senders", "Identificar remetentes", "/whatsapp-senders"),
      link("contact-requests", "Solicitações de contatos", "/contact-requests"),
    );
  if (communication.length) items.push(group("communication", "Comunicação", communication));
  if (isAdmin)
    items.push(
      group("settings", "Configurações", [
        link("parameters", "Parâmetros", "/parameters"),
        ...(isFeatureEnabled(parameters, FEATURE_FLAGS.sipConfig)
          ? [link("sip-config", "Configuração SIP", "/sip-config")]
          : []),
      ]),
    );
  if (isAdmin && isFeatureEnabled(parameters, FEATURE_FLAGS.whatsappSessionMonitoring)) {
    items.push({ ...link("channels", "Canais WhatsApp", "/channels"), icon: "channels" });
  }
  if (isAdmin && !isExternalOperator(role) && isFeatureEnabled(parameters, FEATURE_FLAGS.funnels)) {
    items.push({ ...link("pipelines", "Pipelines", "/funnel"), icon: "pipelines" });
  }
  if (isAdmin && ai.length)
    items.push(
      group(
        "ai",
        "IA",
        ai.map((route) => link(route.href.slice(1), route.title, route.href)),
        "ai",
      ),
    );
  if (isAdmin && isFeatureEnabled(parameters, FEATURE_FLAGS.massMessages)) {
    items.push({ ...link("mass-messages", "Disparos", "/tools/mass-messages"), icon: "campaign" });
  }
  if (isAdmin) {
    items.push(
      group(
        "reports",
        "Relatórios",
        reportsRoutes(parameters, instance).map((route, index) =>
          link(`report-${index}`, route.title, route.href),
        ),
        "reports",
      ),
    );
    items.push({ ...link("news", "Novidades", "/changelog"), icon: "news" });
  }
  return items;
}

export function navigationLeaves(
  items: NavigationItem[],
): Extract<NavigationItem, { kind: "link" }>[] {
  return items.flatMap((item) => (item.kind === "link" ? [item] : navigationLeaves(item.routes)));
}

/** Most specific matching leaf wins; query-specific destinations remain distinct. */
export function activeNavigationPath(
  items: NavigationItem[],
  pathname: string,
  instance: string,
  search = "",
): NavigationItem[] {
  let best: NavigationItem[] = [],
    bestScore = -1;
  const actualQuery = new URLSearchParams(search);
  const visit = (nodes: NavigationItem[], parents: NavigationItem[]) => {
    for (const item of nodes) {
      if (item.kind === "group") {
        visit(item.routes, [...parents, item]);
        continue;
      }
      const [href, query] = item.href.split("?");
      const wanted = new URLSearchParams(query);
      let matchesQuery = true;
      wanted.forEach((value, key) => {
        let actual = actualQuery.get(key);
        if (
          href === "/crm-exceptions" &&
          key === "kind" &&
          !["cities", "customers", "states", "segments"].includes(actual ?? "")
        )
          actual = "cities";
        if (actual !== value) matchesQuery = false;
      });
      if (!matchesQuery) continue;
      for (const candidate of [href, ...(item.aliases ?? [])]) {
        if (!isNavigationRouteActive(pathname, instance, candidate)) continue;
        const score = candidate.length + wanted.size * 1000;
        if (score > bestScore) {
          bestScore = score;
          best = [...parents, item];
        }
      }
    }
  };
  visit(items, []);
  return best;
}

export function isModernCrmPath(pathname: string): boolean {
  const route = pathname.split("?")[0].split("/").filter(Boolean)[1];
  return [
    "monitor",
    "customers",
    "users",
    "crm-customers",
    "customer-segments",
    "crm-catalogs",
    "user-catalogs",
    "crm-purchases",
    "crm-campaigns",
    "crm-results",
    "crm-exceptions",
    "crm-ordering",
  ].includes(route);
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
