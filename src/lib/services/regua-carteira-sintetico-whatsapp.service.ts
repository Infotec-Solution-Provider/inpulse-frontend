import axios from "axios";

const REPORTS_URL = process.env["NEXT_PUBLIC_REPORTS_URL"] || "http://localhost:8006";
const BASE = `${REPORTS_URL}/api/reports/regua-carteira-sintetico-whatsapp`;

function authHeader(token: string) {
  return { headers: { authorization: token } };
}

export interface ReguaCarteira {
  CODIGO: number;
  NOME: string;
  TIPO: string | null;
}

export interface ReguaOperador {
  CODIGO: number;
  NOME: string;
  ATIVO: "SIM" | "NAO" | string;
}

export interface ReguaFilters {
  carteiras: ReguaCarteira[];
  operadores: ReguaOperador[];
}

export interface ReguaRow {
  tipo: string;
  quantidadeBase: number;
  clientesTrabalhados: number;
  ligacoes: number;
  contatosTelefonia: number;
  conversasWhatsapp: number;
  contatosWhatsapp: number;
  contatosTotal: number;
  aproveitamento: number;
  sucessos: number;
  conversao: number;
  clientesContato: number;
}

export interface ReguaSyntheticReport {
  modoRelatorio: "SINTETICO";
  periodo: { dataInicial: string; dataFinal: string };
  operadorAtivo: "SIM" | "NAO" | "AMBOS";
  carteirasSelecionadas: number[];
  operadoresSelecionados: number[];
  rows: ReguaRow[];
}

export type ReguaAnalysisMetrics = {
  discadas: number;
  contatosTelefonia: number;
  contatosWhatsapp: number;
  contatosTotal: number;
  sucessos: number;
  quantidadeBase: number;
  conversasWhatsapp: number;
};

export interface ReguaAnalysisReport extends Omit<ReguaSyntheticReport, "modoRelatorio" | "rows"> {
  modoRelatorio: "ANALITICO";
  tipos: string[];
  rows: {
    operador: string;
    tipoMetrics: Record<string, ReguaAnalysisMetrics>;
    totais: ReguaAnalysisMetrics & { aproveitamento: number; conversao: number };
  }[];
}

export type ReguaReportData = ReguaSyntheticReport | ReguaAnalysisReport;
export type OperadorAtivoFiltro = "SIM" | "NAO" | "AMBOS";
export type ReguaMode = "SINTETICO" | "ANALITICO";

export interface ReguaReportParams {
  carteiras: number[];
  operadores: number[];
  operadorAtivo: OperadorAtivoFiltro;
  modoRelatorio: ReguaMode;
  dataInicial: string;
  dataFinal: string;
}

function reportQuery(params: ReguaReportParams) {
  return {
    ...params,
    carteiras: params.carteiras.join(","),
    operadores: params.operadores.join(","),
  };
}

class ReguaCarteiraSinteticoWhatsappService {
  async getFilters(token: string, signal?: AbortSignal): Promise<ReguaFilters> {
    const res = await axios.get<{ data: ReguaFilters }>(`${BASE}/filters`, {
      ...authHeader(token),
      signal,
    });
    return res.data.data;
  }

  async getReport(
    token: string,
    params: ReguaReportParams,
    signal?: AbortSignal,
  ): Promise<ReguaReportData> {
    const res = await axios.get<{ data: ReguaReportData }>(BASE, {
      ...authHeader(token),
      params: reportQuery(params),
      signal,
    });
    return res.data.data;
  }

  async exportReport(
    token: string,
    params: ReguaReportParams,
    format: "csv" | "pdf",
  ): Promise<Blob> {
    const path = format === "csv" ? "/export-csv" : "/export";
    const res = await axios.get<Blob>(BASE + path, {
      ...authHeader(token),
      params: reportQuery(params),
      responseType: "blob",
    });
    return res.data;
  }
}

export default new ReguaCarteiraSinteticoWhatsappService();
