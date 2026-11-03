import ApiClient from "./api-client";
import { crmMutationConfig, type CrmRequestContext } from "./crm-request-context";
import type { ImportCapabilities, ImportJob, ImportPreviewInput } from "./types/crm-imports.types";

/** All requests bind the captured credentials, including result/report reads. Never refresh/retry a write. */
export default class CrmImportsClient extends ApiClient {
  constructor(
    baseUrl: string,
    private readonly context: CrmRequestContext,
  ) {
    super(baseUrl);
  }
  private config() {
    return crmMutationConfig(this.context);
  }
  async capabilities(): Promise<ImportCapabilities> {
    return (
      await this.ax.get<{ data: ImportCapabilities }>(
        "/api/crm-imports/capabilities",
        this.config(),
      )
    ).data.data;
  }
  async preview(input: ImportPreviewInput): Promise<ImportJob> {
    return (
      await this.ax.post<{ data: ImportJob }>("/api/crm-imports/preview", input, this.config())
    ).data.data;
  }
  async result(id: string): Promise<ImportJob> {
    return (
      await this.ax.get<{ data: ImportJob }>(
        `/api/crm-imports/${encodeURIComponent(id)}`,
        this.config(),
      )
    ).data.data;
  }
  async execute(id: string, rows: number[]): Promise<ImportJob> {
    return (
      await this.ax.post<{ data: ImportJob }>(
        `/api/crm-imports/${encodeURIComponent(id)}/execute`,
        { rows },
        this.config(),
      )
    ).data.data;
  }
  async discard(id: string): Promise<void> {
    await this.ax.delete(`/api/crm-imports/${encodeURIComponent(id)}`, this.config());
  }
  async report(id: string): Promise<Blob> {
    return (
      await this.ax.get<Blob>(`/api/crm-imports/${encodeURIComponent(id)}/errors.csv`, {
        ...this.config(),
        responseType: "blob",
      })
    ).data;
  }
}
