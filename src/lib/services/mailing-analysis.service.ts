import axios from "axios";

const REPORTS_URL = process.env["NEXT_PUBLIC_REPORTS_URL"] || "http://localhost:8006";
const BASE = `${REPORTS_URL}/api/reports/mailing-analysis`;

function authHeader(token: string) {
  return { headers: { authorization: token } };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MailingCampanha {
  campanhaNome: string;
  carteiras: { codigo: number; unidade: string }[];
}

export interface MailingOperador {
  CODIGO: number;
  NOME: string;
}

export interface MailingFilters {
  campaigns: MailingCampanha[];
  operadores: MailingOperador[];
}

export interface MailingSummary {
  totalClientes: number;
  totalLigacoes: number;
  totalContatosLigacao: number;
  totalContatosWhatsapp: number;
  totalContatosTotal: number;
  totalClientesNuncaContatados: number;
  totalClientesDesativados: number;
}

export interface ResultadoRow {
  nome: string;
  quantidade: number;
}

export interface MailingReportData {
  campanhas: string[];
  operadores: string[];
  summary: MailingSummary;
  ativo: ResultadoRow[];
  receptivo: ResultadoRow[];
  timeline: Array<{ data: string; resultado: string; quantidade: number }>;
}

export type MailingTipo = "ATIVO" | "RECEPTIVO" | "AMBOS";

export interface MailingReportParams {
  carteiras: number[];
  operadores: number[];
  dataInicial: string;
  dataFinal: string;
  tipo: MailingTipo;
  campanhaNames: string[];
}

class MailingAnalysisService {
  async getFilters(token: string, signal?: AbortSignal): Promise<MailingFilters> {
    const res = await axios.get<{ data: MailingFilters }>(`${BASE}/filters`, {
      ...authHeader(token),
      signal,
    });
    return res.data.data;
  }

  async getReport(
    token: string,
    params: MailingReportParams,
    signal?: AbortSignal,
  ): Promise<MailingReportData> {
    const res = await axios.get<{ data: MailingReportData }>(BASE, {
      ...authHeader(token),
      signal,
      params: {
        ...params,
        carteiras: params.carteiras.join(","),
        operadores: params.operadores.join(","),
        campanhaNames: params.campanhaNames.join(","),
      },
    });
    return res.data.data;
  }

  async exportReport(
    token: string,
    params: MailingReportParams & { format: "csv" | "pdf" },
  ): Promise<Blob> {
    const res = await axios.post<Blob>(`${BASE}/export`, params, {
      ...authHeader(token),
      responseType: "blob",
    });
    return res.data;
  }
}

export default new MailingAnalysisService();
