import { InstancesClient } from "@in.pulse-crm/sdk";

export interface GeoStateOption {
  code: string;
  name: string;
}

const NEXT_PUBLIC_INSTANCES_URL = process.env.NEXT_PUBLIC_INSTANCES_URL || "http://localhost:8000";

class FrontendInstancesService extends InstancesClient {
  public async getStates() {
    const response = await this.ax.get<{
      message: string;
      data: GeoStateOption[];
    }>("/api/instances/geo/states");

    return response.data.data;
  }

  public async getCitiesByState(uf: string) {
    const response = await this.ax.get<{
      message: string;
      data: string[];
    }>(`/api/instances/geo/states/${uf.trim().toUpperCase()}/cities`);

    return response.data.data;
  }
}

const instancesService = new FrontendInstancesService(NEXT_PUBLIC_INSTANCES_URL);

export default instancesService;