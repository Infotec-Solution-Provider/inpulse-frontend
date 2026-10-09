export type ParameterSource = "whatsapp" | "crm";
export type ParameterScope = "INSTANCE" | "SECTOR" | "USER";
export interface ParameterTarget {
  scope: ParameterScope;
  sectorId?: number;
  userId?: number;
}
export interface ParameterTargets {
  sectors: { id: number; name: string }[];
  users: { id: number; name: string; active: boolean }[];
  hasMoreUsers: boolean;
}

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
  supportedScopes?: ParameterScope[];
}

export interface ParameterSettingsSnapshot {
  catalog: ParameterSetting[];
  values: Record<string, string | null>;
  target?: ParameterTarget & {
    name: string;
    inheritedSectorId?: number | null;
    inheritedSectorName?: string | null;
  };
  inherited?: Record<string, { value: string | null; source: ParameterScope | "DEFAULT" }>;
}

export interface ParameterChange {
  key: string;
  value: string | null;
  previousValue: string | null;
}
