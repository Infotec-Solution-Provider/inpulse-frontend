export const FEATURE_FLAGS = {
  legacyHistory: "feature_legacy_history_enabled",
  newFrontend: "feature_new_frontend_enabled",
  frontendSwitch: "feature_frontend_switch_enabled",
  crmCustomers: "feature_crm_customers_enabled",
  crmUsers: "feature_crm_users_enabled",
  crmUnitsCampaigns: "feature_crm_units_campaigns_enabled",
  crmSales: "feature_crm_sales_enabled",
  crmImports: "feature_crm_imports_enabled",
  crmEmail: "feature_crm_email_enabled",
  crmSatisfaction: "feature_crm_satisfaction_enabled",
  crmAdministration: "feature_crm_administration_enabled",
  telephonyMonitoring: "feature_telephony_monitoring_enabled",
  contactRequests: "feature_contact_requests_enabled",
  parameterSettings: "feature_parameter_settings_enabled",
  ai: "feature_ai_enabled",
  aiAgents: "feature_ai_agents_enabled",
  aiSupervisor: "feature_ai_supervisor_enabled",
  aiSettings: "feature_ai_settings_enabled",
  chatExport: "feature_chat_export_enabled",
  customerProfileTags: "feature_customer_profile_tags_enabled",
  funnels: "feature_funnels_enabled",
  massMessages: "feature_mass_messages_enabled",
  reportsAdvanced: "feature_reports_advanced_enabled",
  reportsDashboards: "feature_reports_dashboards_enabled",
  salesReports: "feature_sales_reports_enabled",
  sipConfig: "feature_sip_config_enabled",
  telephonyDialer: "feature_telephony_dialer_enabled",
  whatsappSessionMonitoring: "feature_whatsapp_session_monitoring_enabled",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
export type FeatureParameters = Record<string, string | undefined>;

export const DEFAULT_FEATURE_PARAMETERS: Record<string, string> = {
  [FEATURE_FLAGS.legacyHistory]: "false",
};

// The homolog frontend exposed these modules before rollout flags existed.
// Apply this bridge only to its known test tenants and never override a value
// explicitly supplied by the backend. Other builds and Odim remain deny-by-default.
const HOMOLOG_EXISTING_TENANTS = new Set(["homolog", "suprimaxxi", "infotec"]);
const HOMOLOG_EXISTING_FEATURES: FeatureFlag[] = [
  FEATURE_FLAGS.crmCustomers,
  FEATURE_FLAGS.crmUsers,
  FEATURE_FLAGS.crmUnitsCampaigns,
  FEATURE_FLAGS.crmSales,
  FEATURE_FLAGS.crmImports,
  FEATURE_FLAGS.crmEmail,
  FEATURE_FLAGS.crmSatisfaction,
  FEATURE_FLAGS.crmAdministration,
  FEATURE_FLAGS.telephonyMonitoring,
  FEATURE_FLAGS.contactRequests,
  FEATURE_FLAGS.parameterSettings,
];

export function resolveFeatureParameters(
  instance: string,
  parameters: Record<string, string>,
): Record<string, string> {
  const resolved = { ...DEFAULT_FEATURE_PARAMETERS, ...parameters };
  if (
    process.env.NEXT_PUBLIC_HOMOLOG_LEGACY_FEATURE_ACCESS === "true" &&
    HOMOLOG_EXISTING_TENANTS.has(instance)
  ) {
    for (const flag of HOMOLOG_EXISTING_FEATURES) {
      if (resolved[flag] === undefined) resolved[flag] = "true";
    }
  }
  return resolved;
}

export function isFeatureEnabled(parameters: FeatureParameters, flag: FeatureFlag): boolean {
  return parameters[flag] === "true";
}

export function hasAnyFeature(parameters: FeatureParameters, flags: FeatureFlag[]): boolean {
  return flags.some((flag) => isFeatureEnabled(parameters, flag));
}
