import catalogFixtures from "./catalog-fixtures.json";
import type {
  ParameterChange,
  ParameterSettingsSnapshot,
  ParameterSource,
  ParameterSetting,
  ParameterTarget,
} from "../../src/lib/parameters/parameter-settings.types";

const whatsappParameterSettings = catalogFixtures.whatsapp as ParameterSetting[];
const crmParameterSettings = catalogFixtures.crm as Omit<ParameterSetting, "defaultValue">[];

const snapshots: Record<ParameterSource, ParameterSettingsSnapshot> = {
  whatsapp: {
    catalog: whatsappParameterSettings,
    values: Object.fromEntries(
      whatsappParameterSettings.map((setting) => [
        setting.key,
        setting.key === "chat_auto_finish_idle_time" ? "3600000" : null,
      ]),
    ),
  },
  crm: {
    catalog: crmParameterSettings.map((setting) => ({
      ...setting,
      defaultValue: setting.type === "boolean" ? setting.falseValue! : "10",
      canReset: true,
    })),
    values: Object.fromEntries(
      crmParameterSettings.map((setting) => [
        setting.key,
        setting.type === "boolean" ? setting.falseValue! : "20",
      ]),
    ),
  },
};
const state = {
  calls: [] as { source: ParameterSource; changes: ParameterChange[]; target?: ParameterTarget }[],
  refreshes: 0,
  failLoad: new URLSearchParams(location.search).has("load-error"),
  failSave: false,
  delays: {} as Record<string, number>,
  completedReads: [] as string[],
};
const scopeValues: Record<string, Record<string, string | null>> = {};
const sectorOptions = [
  { id: 11, name: "Comercial" },
  { id: 12, name: "Suporte" },
];
const userOptions = [
  { id: 7, name: "Ana", active: true },
  { id: 8, name: "Bruno", active: false },
];
const identity = (target: ParameterTarget) =>
  `${target.scope}:${target.sectorId ?? target.userId ?? ""}`;
function getWhatsapp(target: ParameterTarget): ParameterSettingsSnapshot {
  if (target.scope === "INSTANCE") return structuredClone(snapshots.whatsapp);
  const catalog = whatsappParameterSettings.filter(
    (setting) =>
      !setting.key.startsWith("require_supervisor_approval_") &&
      setting.key !== "feature_internal_group_whatsapp_sync_enabled" &&
      (target.scope !== "USER" || setting.key !== "customer_linking_bot_enabled"),
  );
  const own = scopeValues[identity(target)] ?? {};
  const sector = target.scope === "USER" ? (scopeValues["SECTOR:11"] ?? {}) : {};
  return {
    target: {
      ...target,
      name:
        target.scope === "USER"
          ? userOptions.find((user) => user.id === target.userId)!.name
          : sectorOptions.find((sector) => sector.id === target.sectorId)!.name,
      ...(target.scope === "USER"
        ? { inheritedSectorId: 11, inheritedSectorName: "Comercial" }
        : {}),
    },
    catalog,
    values: Object.fromEntries(catalog.map((setting) => [setting.key, own[setting.key] ?? null])),
    inherited: Object.fromEntries(
      catalog.map((setting) => [
        setting.key,
        {
          value:
            sector[setting.key] ?? snapshots.whatsapp.values[setting.key] ?? setting.defaultValue,
          source:
            sector[setting.key] != null
              ? "SECTOR"
              : snapshots.whatsapp.values[setting.key] != null
                ? "INSTANCE"
                : "DEFAULT",
        },
      ]),
    ),
  };
}
declare global {
  interface Window {
    parameterTest: typeof state;
  }
}
window.parameterTest = state;

export function useAuthContext() {
  return {
    instance: "test",
    user: {
      CODIGO: 7,
      NIVEL: new URLSearchParams(location.search).has("operator") ? "USER" : "ADMIN",
    },
  };
}
export function useWhatsappContext() {
  return {
    refreshParameters: async () => {
      state.refreshes += 1;
    },
  };
}
export const parameterSettingsService = {
  async getTargets(scope: "SECTOR" | "USER", search: string) {
    return {
      sectors: sectorOptions,
      users:
        scope === "USER"
          ? userOptions.filter((user) =>
              `${user.name} ${user.id}`.toLowerCase().includes(search.toLowerCase()),
            )
          : [],
      hasMoreUsers: false,
    };
  },
  async get(
    source: ParameterSource,
    _signal?: AbortSignal,
    target: ParameterTarget = { scope: "INSTANCE" },
  ) {
    if (state.failLoad) throw new Error("Falha ao carregar configurações");
    const data = source === "whatsapp" ? getWhatsapp(target) : structuredClone(snapshots.crm);
    if (state.delays[identity(target)])
      await new Promise((resolve) => setTimeout(resolve, state.delays[identity(target)]));
    state.completedReads.push(identity(target));
    return data;
  },
  async save(
    source: ParameterSource,
    changes: ParameterChange[],
    target: ParameterTarget = { scope: "INSTANCE" },
  ) {
    if (state.failSave) throw new Error("Falha ao salvar configurações");
    state.calls.push({
      source,
      changes: structuredClone(changes),
      ...(source === "whatsapp" ? { target: structuredClone(target) } : {}),
    });
    const values =
      source === "whatsapp" && target.scope !== "INSTANCE"
        ? (scopeValues[identity(target)] ?? (scopeValues[identity(target)] = {}))
        : snapshots[source].values;
    for (const change of changes) {
      values[change.key] =
        change.value === null && source === "crm"
          ? snapshots[source].catalog.find((setting) => setting.key === change.key)!.defaultValue
          : change.value;
    }
    return source === "whatsapp" ? getWhatsapp(target) : structuredClone(snapshots.crm);
  },
};
