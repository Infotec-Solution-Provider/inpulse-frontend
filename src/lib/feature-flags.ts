export const FEATURE_FLAGS = {
  ai: "feature_ai_enabled",
  aiAgents: "feature_ai_agents_enabled",
  aiSupervisor: "feature_ai_supervisor_enabled",
  aiSettings: "feature_ai_settings_enabled",
  customerProfileTags: "feature_customer_profile_tags_enabled",
  funnels: "feature_funnels_enabled",
  massMessages: "feature_mass_messages_enabled",
  reportsAdvanced: "feature_reports_advanced_enabled",
  reportsDashboards: "feature_reports_dashboards_enabled",
  salesReports: "feature_sales_reports_enabled",
  sipConfig: "feature_sip_config_enabled",
  telephonyDialer: "feature_telephony_dialer_enabled",
  frontendPerformanceTelemetry: "feature_frontend_performance_telemetry_enabled",
  paginatedChatHistory: "feature_perf_paginated_chat_history_enabled",
  stableSocketListeners: "feature_perf_stable_socket_listeners_enabled",
  virtualizedChatList: "feature_perf_virtualized_chat_list_enabled",
  whatsappSessionMonitoring: "feature_whatsapp_session_monitoring_enabled",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
export type FeatureParameters = Record<string, string | undefined>;

export function isFeatureEnabled(parameters: FeatureParameters, flag: FeatureFlag): boolean {
  return parameters[flag] === "true";
}

export function hasAnyFeature(parameters: FeatureParameters, flags: FeatureFlag[]): boolean {
  return flags.some((flag) => isFeatureEnabled(parameters, flag));
}
