export type FunnelSnapshotStatus = "idle" | "processing" | "done" | "failed";
export type FunnelType = "AUTOMATIC" | "MANUAL";

export interface FunnelCard {
  entryId?: number; // only present for manual funnel cards
  ccId: number;
  clienteId: number;
  nome: string;
  fone1: string | null;
  groupCode?: number | null;
  groupName?: string | null;
  segmentCode?: number | null;
  segmentName?: string | null;
  campanha: string | null;
  agendamento: string | null;
  operador: string | null;
  totalContatos: number;
  totalVendas?: number;
  ultimoContato: string | null;
}

export type FunnelBoardSortField = "ultimoContato" | "nome" | "agendamento" | "totalContatos" | "operador";
export type FunnelBoardSortOrder = "asc" | "desc";

export interface FunnelBoardFilters {
  groupQuery: string;
  segmentQuery: string;
  operatorQuery: string;
  campaignQuery: string;
  lastContactFrom: string;
  lastContactTo: string;
  scheduleFrom: string;
  scheduleTo: string;
  sortBy: FunnelBoardSortField;
  sortOrder: FunnelBoardSortOrder;
}

export interface FunnelDef {
  id: number;
  instance: string;
  name: string;
  type: FunnelType;
  createdAt: string;
  stages?: FunnelStageDef[];
}

export interface FunnelStageDef {
  id: number;
  funnelId: number;
  name: string;
  color: string;
  createdAt: string;
}

export interface FunnelBoardColumn {
  stageId: number;
  stageName: string;
  color: string;
  total: number;
  clients: FunnelCard[];
}

export interface FunnelBoard {
  columns: FunnelBoardColumn[];
  snapshotId: number;
  computedAt: string | null;
}

export interface FunnelSnapshotStatusResponse {
  id: number;
  status: string;
  computedAt: string | null;
  createdAt: string;
}

export interface FunnelClientsResponse {
  clients: FunnelCard[];
  page: { current: number; perPage: number; totalRows: number };
}

// ── Stage conditions ──────────────────────────────────────────────────────────

export type StageConditionType =
  | "RESULTADO"
  | "AGENDAMENTO"
  | "COMPRA"
  | "NO_CONTACT"
  | "MIN_CONTATOS";

// ── Condition params ──────────────────────────────────────────────────────────

export interface ResultadoParams {
  scope: "last" | "period" | "all_time";
  periodDays?: number;
  resultadoFilter?: {
    operator: "in" | "not_in";
    resultadoIds: number[];
  };
  isVenda?: boolean | null;
  isContato?: boolean | null;
  isSucesso?: boolean | null;
}

export interface AgendamentoParams {
  has: boolean;
  minDays?: number;
  maxDays?: number;
}

export interface CompraParams {
  has?: boolean;
  minLastDate?: string | null;
  maxLastDate?: string | null;
  minValor?: number | null;
  maxValor?: number | null;
  valorPeriodDays?: number | null;
}

export interface NoContactParams {
  days: number;
}

export interface MinContatosParams {
  min: number;
  days: number;
}

export type ConditionParams =
  | ResultadoParams
  | AgendamentoParams
  | CompraParams
  | NoContactParams
  | MinContatosParams;

export interface StageCondition {
  id: number;
  stageId: number;
  type: StageConditionType;
  params: ConditionParams | null;
}

export interface ConditionTemplate {
  id: number;
  name: string;
  type: StageConditionType;
  params: ConditionParams | null;
  createdAt: string;
}

export interface FunnelStageWithConditions extends FunnelStageDef {
  conditions: StageCondition[];
}

export interface FunnelConfigResult {
  funnel: {
    id: number;
    name: string;
    type: FunnelType;
    stages: FunnelStageWithConditions[];
  };
  resultados: { id: number; nome: string }[];
  templates: ConditionTemplate[];
}

