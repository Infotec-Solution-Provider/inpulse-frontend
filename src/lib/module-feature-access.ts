import { FEATURE_FLAGS as F, isFeatureEnabled, type FeatureFlag, type FeatureParameters } from "./feature-flags";

/** Tenant-relative paths. Keep menu and direct navigation on the same deny-by-default catalog. */
export const ROUTE_FEATURE_FLAGS: ReadonlyArray<{ segment: string; flags: readonly FeatureFlag[] }> = [
  ...["/crm-customers", "/crm-catalogs", "/customer-segments"].map(segment => ({ segment, flags: [F.crmCustomers] })),
  { segment: "/user-catalogs", flags: [F.crmUsers] },
  ...["/crm-units", "/crm-campaigns", "/crm-ordering", "/crm-results", "/crm-exceptions"].map(segment => ({ segment, flags: [F.crmUnitsCampaigns] })),
  ...["/crm-purchases", "/crm-proposals"].map(segment => ({ segment, flags: [F.crmSales] })),
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
  ...["operators", "goals-dashboard", "team-goals", "lead-origin-quality", "lost-reasons", "operator-performance", "mailing-analysis", "regua-carteira-sintetico-whatsapp"].map(segment => ({ segment: `/reports/${segment}`, flags: [F.reportsAdvanced] })),
  { segment: "/reports/sales", flags: [F.salesReports] },
  ...["dashboards", "metrics", "report-generator", "generated"].map(segment => ({ segment: `/reports/${segment}`, flags: [F.reportsDashboards] })),
  { segment: "/reports/chats", flags: [F.chatExport] },
];

export function relativeApplicationPath(pathname: string, instance?: string): string {
  let path = pathname.split(/[?#]/)[0];
  if (path === "/nova" || path.startsWith("/nova/")) path = path.slice(5) || "/";
  if (instance) {
    const prefix = `/${encodeURIComponent(instance)}`;
    const rawPrefix = `/${instance}`;
    for (const candidate of [prefix, rawPrefix]) {
      if (path === candidate || path.startsWith(`${candidate}/`)) return path.slice(candidate.length) || "/";
    }
  }
  return path || "/";
}

export function featureRoute(pathname: string, instance?: string) {
  const path = relativeApplicationPath(pathname, instance);
  return ROUTE_FEATURE_FLAGS.find(({ segment }) => path === segment || path.startsWith(`${segment}/`));
}

// These routes were already accessible in the existing homolog frontend before
// the rollout gates were introduced. This build-only bridge preserves that
// behavior for the three existing test tenants; explicit flags still win.
const HOMOLOG_EXISTING_TENANTS = new Set(["homolog", "suprimaxxi", "infotec"]);
const HOMOLOG_EXISTING_ROUTES = new Set([
  "/crm-customers", "/crm-catalogs", "/customer-segments", "/user-catalogs",
  "/crm-units", "/crm-campaigns", "/crm-ordering", "/crm-results", "/crm-exceptions",
  "/crm-purchases", "/crm-proposals", "/crm-imports", "/crm-email", "/crm-satisfaction",
  "/crm-administration", "/contact-requests", "/parameters", "/reports/generated",
]);

export function canAccessFeaturePath(parameters: FeatureParameters, pathname: string, instance?: string): boolean {
  const config = featureRoute(pathname, instance);
  if (!config) return true;
  if (
    process.env.NEXT_PUBLIC_HOMOLOG_LEGACY_FEATURE_ACCESS === "true" &&
    !!instance && HOMOLOG_EXISTING_TENANTS.has(instance) && HOMOLOG_EXISTING_ROUTES.has(config.segment) &&
    config.flags.every(flag => parameters[flag] === undefined)
  ) return true;
  return config.flags.every(flag => isFeatureEnabled(parameters, flag));
}
