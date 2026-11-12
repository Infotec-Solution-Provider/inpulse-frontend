import {
  FEATURE_FLAGS as F,
  isFeatureEnabled,
  type FeatureFlag,
  type FeatureParameters,
} from "./feature-flags";

/** Tenant-relative paths. Keep menu and direct navigation on the same deny-by-default catalog. */
export const ROUTE_FEATURE_FLAGS: ReadonlyArray<{
  segment: string;
  flags: readonly FeatureFlag[];
}> = [
  ...["/crm-customers", "/crm-catalogs", "/customer-segments"].map((segment) => ({
    segment,
    flags: [F.crmCustomers],
  })),
  { segment: "/user-catalogs", flags: [F.crmUsers] },
  ...["/crm-units", "/crm-campaigns", "/crm-ordering", "/crm-results", "/crm-exceptions"].map(
    (segment) => ({ segment, flags: [F.crmUnitsCampaigns] }),
  ),
  ...["/crm-purchases", "/crm-proposals"].map((segment) => ({ segment, flags: [F.crmSales] })),
  { segment: "/crm-imports", flags: [F.crmImports] },
  { segment: "/crm-email", flags: [F.crmEmail] },
  { segment: "/crm-satisfaction", flags: [F.crmSatisfaction] },
  { segment: "/crm-administration", flags: [F.crmAdministration] },
  { segment: "/contact-requests", flags: [F.contactRequests] },
  { segment: "/parameters", flags: [F.parameterSettings] },
  { segment: "/channels", flags: [F.whatsappSessionMonitoring] },
  { segment: "/ai-supervisor", flags: [F.ai, F.aiSupervisor] },
  { segment: "/ai-agents", flags: [F.ai, F.aiAgents] },
  { segment: "/ai-settings", flags: [F.ai, F.aiSettings] },
  { segment: "/funnel", flags: [F.funnels] },
  { segment: "/sip-config", flags: [F.sipConfig] },
  { segment: "/tools/mass-messages", flags: [F.massMessages] },
  ...[
    "operators",
    "goals-dashboard",
    "team-goals",
    "lead-origin-quality",
    "lost-reasons",
    "operator-performance",
    "mailing-analysis",
    "regua-carteira-sintetico-whatsapp",
  ].map((segment) => ({ segment: `/reports/${segment}`, flags: [F.reportsAdvanced] })),
  { segment: "/reports/sales", flags: [F.salesReports] },
  ...["dashboards", "metrics", "report-generator", "generated"].map((segment) => ({
    segment: `/reports/${segment}`,
    flags: [F.reportsDashboards],
  })),
  { segment: "/reports/chats", flags: [F.chatExport] },
];

export function relativeApplicationPath(pathname: string, instance?: string): string {
  let path = pathname.split(/[?#]/)[0];
  if (path === "/nova" || path.startsWith("/nova/")) path = path.slice(5) || "/";
  if (instance) {
    const prefix = `/${encodeURIComponent(instance)}`;
    const rawPrefix = `/${instance}`;
    for (const candidate of [prefix, rawPrefix]) {
      if (path === candidate || path.startsWith(`${candidate}/`))
        return path.slice(candidate.length) || "/";
    }
  }
  return path || "/";
}

export function featureRoute(pathname: string, instance?: string) {
  const path = relativeApplicationPath(pathname, instance);
  return ROUTE_FEATURE_FLAGS.find(
    ({ segment }) => path === segment || path.startsWith(`${segment}/`),
  );
}

export function canAccessFeaturePath(
  parameters: FeatureParameters,
  pathname: string,
  instance?: string,
): boolean {
  const config = featureRoute(pathname, instance);
  return !config || config.flags.every((flag) => isFeatureEnabled(parameters, flag));
}
