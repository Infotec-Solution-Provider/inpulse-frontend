import { whatsappParameterSettings } from "../../../whatsapp-service/src/parameters/parameter-settings.catalog";
import { crmParameterSettings } from "../../../users-service/src/parameters/crm-parameter-settings.catalog";
import type {
  ParameterChange,
  ParameterSettingsSnapshot,
  ParameterSource,
} from "../../src/lib/parameters/parameter-settings.types";

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
  calls: [] as { source: ParameterSource; changes: ParameterChange[] }[],
  refreshes: 0,
  failLoad: new URLSearchParams(location.search).has("load-error"),
  failSave: false,
};
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
  async get(source: ParameterSource) {
    if (state.failLoad) throw new Error("Falha ao carregar configurações");
    return structuredClone(snapshots[source]);
  },
  async save(source: ParameterSource, changes: ParameterChange[]) {
    if (state.failSave) throw new Error("Falha ao salvar configurações");
    state.calls.push({ source, changes: structuredClone(changes) });
    for (const change of changes) {
      snapshots[source].values[change.key] =
        change.value === null && source === "crm"
          ? snapshots[source].catalog.find((setting) => setting.key === change.key)!.defaultValue
          : change.value;
    }
    return structuredClone(snapshots[source]);
  },
};
