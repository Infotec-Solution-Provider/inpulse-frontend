import ApiClient from "@/lib/sdk-local/api-client";
import type {
  ParameterChange,
  ParameterSettingsSnapshot,
  ParameterSource,
} from "@/lib/parameters/parameter-settings.types";

const clients = {
  whatsapp: new ApiClient(process.env.NEXT_PUBLIC_WHATSAPP_URL || "http://localhost:8005"),
  crm: new ApiClient(process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001"),
};
const paths = { whatsapp: "/api/whatsapp/parameter-settings", crm: "/api/crm/parameter-settings" };

const parameterSettingsService = {
  async get(source: ParameterSource, signal?: AbortSignal) {
    const response = await clients[source].ax.get<{ data: ParameterSettingsSnapshot }>(
      paths[source],
      { signal },
    );
    return response.data.data;
  },
  async save(source: ParameterSource, changes: ParameterChange[]) {
    const response = await clients[source].ax.patch<{ data: ParameterSettingsSnapshot }>(
      paths[source],
      { changes },
    );
    return response.data.data;
  },
};
export default parameterSettingsService;
