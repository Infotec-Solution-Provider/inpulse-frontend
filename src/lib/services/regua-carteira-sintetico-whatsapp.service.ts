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

export interface ReguaReportData {
  periodo: { dataInicial: string; dataFinal: string };
  operadorAtivo: "SIM" | "NAO" | "AMBOS";
  carteirasSelecionadas: number[];
  operadoresSelecionados: number[];
  rows: ReguaRow[];
}

export type OperadorAtivoFiltro = "SIM" | "NAO" | "AMBOS";

class ReguaCarteiraSinteticoWhatsappService {
  async getFilters(token: string): Promise<ReguaFilters> {
    const res = await axios.get<{ data: ReguaFilters }>(`${BASE}/filters`, authHeader(token));
    return res.data.data;
  }

  async getReport(
    token: string,
    params: {
      carteiras: number[];
      operadores: number[];
      operadorAtivo: OperadorAtivoFiltro;
      dataInicial: string;
      dataFinal: string;
    },
  ): Promise<ReguaReportData> {
    const res = await axios.get<{ data: ReguaReportData }>(BASE, {
      ...authHeader(token),
      params: {
        carteiras: params.carteiras.join(","),
        operadores: params.operadores.join(","),
        operadorAtivo: params.operadorAtivo,
        dataInicial: params.dataInicial,
        dataFinal: params.dataFinal,
      },
    });
    return res.data.data;
  }
}

export default new ReguaCarteiraSinteticoWhatsappService();
