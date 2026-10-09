export type ParameterSource = "whatsapp" | "crm";

export interface ParameterSetting {
  key: string;
  label: string;
  description: string;
  group: string;
  type: "boolean" | "number";
  defaultValue: string | null;
  trueValue?: string;
  falseValue?: string;
  unit?: string;
  multiplier?: number;
  min?: number;
  max?: number;
  canReset?: boolean;
}

export interface ParameterSettingsSnapshot {
  catalog: ParameterSetting[];
  values: Record<string, string | null>;
}

export interface ParameterChange {
  key: string;
  value: string | null;
  previousValue: string | null;
}
