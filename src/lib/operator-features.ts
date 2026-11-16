export type OperatorFeature = "operator" | "telephony" | "crm" | "whatsapp";
export interface OperatorFeatureCapabilities {
  managed: true;
  instance: "odim";
  operatorId: number;
  features: Record<OperatorFeature, boolean>;
  revision: string;
}
export function isManagedOperatorTenant(instance: string): boolean {
  return (
    instance
      .normalize("NFKD")
      .replace(/[\p{M}\p{Cf}]/gu, "")
      .trim()
      .toLowerCase() === "odim"
  );
}
export function readOperatorFeatures(
  value: unknown,
  operatorId: number,
): OperatorFeatureCapabilities {
  const data = value as OperatorFeatureCapabilities;
  if (
    data?.managed !== true ||
    data.instance !== "odim" ||
    data.operatorId !== operatorId ||
    !/^[a-f0-9]{64}$/.test(data.revision) ||
    !data.features ||
    !["operator", "telephony", "crm", "whatsapp"].every(
      (key) => typeof data.features[key as OperatorFeature] === "boolean",
    )
  ) {
    throw new Error("Não foi possível conferir as permissões do operador.");
  }
  return data;
}
/** Server capabilities take precedence over tenant, sector and user parameters. */
export function operatorFeatureParameters(
  parameters: Record<string, string>,
  managed: boolean,
  capabilities: OperatorFeatureCapabilities | null,
): Record<string, string> {
  if (!managed) return parameters;
  return {
    ...parameters,
    feature_telephony_dialer_enabled: String(capabilities?.features.telephony === true),
    customer_detail_edit_enabled: "false",
    feature_crm_customers_enabled: String(capabilities?.features.crm === true),
  };
}
export function isOperatorFeatureDenied(error: unknown): boolean {
  const value = error as { status?: number; code?: string } | null;
  return value?.status === 403 && value.code === "OPERATOR_FEATURE_PILOT_REQUIRED";
}
