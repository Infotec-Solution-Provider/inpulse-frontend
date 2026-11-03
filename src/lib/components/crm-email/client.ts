import axios from "axios";
import type { Content, Importer, Job, Preview, Settings } from "./types";

/** A fixed session owns each screen; do not refresh or replay an email mutation. */
export class EmailClient {
  private readonly ax;
  constructor(token: string, instance: string) {
    this.ax = axios.create({
      baseURL: `${(process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:8007").replace(/\/$/, "")}/api/marketing/email`,
      timeout: 30_000,
      headers: { Authorization: `Bearer ${token}`, "x-crm-instance": instance },
      ...{ skipAuthInjection: true, skipAuthRefresh: true },
    });
  }
  async settings(): Promise<Settings> {
    return (await this.ax.get("/settings")).data;
  }
  async configure(mode: string, expectedVersion: number): Promise<Settings> {
    return (await this.ax.put("/settings", { mode, expectedVersion })).data;
  }
  async account(data: unknown): Promise<Settings> {
    return (await this.ax.put("/account", data)).data;
  }
  async preview(content: Content): Promise<Preview> {
    return (await this.ax.post("/preview", content)).data;
  }
  async create(content: Content, previewToken: string, requestKey: string): Promise<Job> {
    return (await this.ax.post("/jobs", { content, previewToken, requestKey })).data;
  }
  async jobs(): Promise<Job[]> {
    return (await this.ax.get("/jobs")).data.data;
  }
  async detail(id: string): Promise<Job> {
    return (await this.ax.get(`/jobs/${encodeURIComponent(id)}`)).data;
  }
  async action(job: Job, action: string): Promise<Job> {
    return (
      await this.ax.post(`/jobs/${encodeURIComponent(job.id)}/actions`, {
        action,
        expectedVersion: job.version,
      })
    ).data;
  }
  async importer(page: number): Promise<Importer> {
    return (await this.ax.get("/importer", { params: { page } })).data;
  }
  async saveImporter(data: unknown) {
    return (await this.ax.post("/importer", data)).data;
  }
}
export function emailError(error: unknown) {
  if (error instanceof Error && error.message === "Limite de anexos excedido")
    return "Selecione até 5 anexos, cada um com até 2 MB e total de 4 MB.";
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string")
    return error.response.data.message;
  return "Não foi possível confirmar a operação. Consulte os envios ou tente confirmar com a mesma prévia; a chave será preservada.";
}
export const addresses = (text: string) =>
  text
    .split(/[;,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
export const states: Record<string, string> = {
  DRAFT: "Em revisão",
  RUNNING: "Em processamento",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  ATTENTION: "Requer atenção",
  PENDING: "Pendente",
  PROCESSING: "Enviando",
  SENT: "Aceito pelo servidor SMTP",
  FAILED: "Rejeitado pelo servidor",
  UNKNOWN: "Aceitação incerta — não reenviar",
  BLOCKED: "Bloqueado pela configuração",
};
