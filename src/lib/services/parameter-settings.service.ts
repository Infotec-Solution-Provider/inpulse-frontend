import ApiClient from "@/lib/sdk-local/api-client";
import type {
  ParameterChange,
  ParameterSettingsSnapshot,
  ParameterSource,
  ParameterTarget,
  ParameterTargets,
} from "@/lib/parameters/parameter-settings.types";

const clients = {
  whatsapp: new ApiClient(process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005"),
  crm: new ApiClient(process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001"),
};
const paths = { whatsapp: "/api/whatsapp/parameter-settings", crm: "/api/crm/parameter-settings" };

const parameterSettingsService = {
  async getTargets(scope: "SECTOR" | "USER", search: string, signal?: AbortSignal) {
    const response = await clients.whatsapp.ax.get<{ data: ParameterTargets }>(
      `${paths.whatsapp}/targets`,
      { params: { scope, search }, signal },
    );
    return response.data.data;
  },
  async get(source: ParameterSource, signal?: AbortSignal, target?: ParameterTarget) {
    const response = await clients[source].ax.get<{ data: ParameterSettingsSnapshot }>(
      paths[source],
      { signal, params: source === "whatsapp" ? target : undefined },
    );
    return response.data.data;
  },
  async save(source: ParameterSource, changes: ParameterChange[], target?: ParameterTarget) {
    const response = await clients[source].ax.patch<{ data: ParameterSettingsSnapshot }>(
      paths[source],
      { changes, ...(source === "whatsapp" && target ? { target } : {}) },
    );
    return response.data.data;
  },
};
export default parameterSettingsService;
