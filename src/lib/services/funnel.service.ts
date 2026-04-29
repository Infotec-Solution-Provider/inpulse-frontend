import axios from "axios";
import type {
  ConditionTemplate,
  FunnelBoard,
  FunnelBoardFilters,
  FunnelCard,
  FunnelClientsResponse,
  FunnelConfigResult,
  FunnelDef,
  FunnelSnapshotStatusResponse,
  FunnelStageDef,
  FunnelType,
  StageCondition,
  StageConditionType,
} from "../types/funnel.types";

const base = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:8007";

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

function withTraceId<T extends Record<string, string | number | undefined>>(params: T, traceId?: string): T & { traceId?: string } {
  return traceId ? { ...params, traceId } : params;
}

function buildBoardParams(previewPerStage: number, filters?: FunnelBoardFilters) {
  return {
    preview: previewPerStage,
    ...(filters ?? {}),
  };
}

function buildClientsParams(
  stageId: number,
  page: number,
  perPage: number,
  filters?: FunnelBoardFilters,
) {
  return {
    stageId,
    page,
    perPage,
    ...(filters ?? {}),
  };
}

// ── Funnel CRUD ──────────────────────────────────────────────────────────────

async function listFunnels(token: string): Promise<FunnelDef[]> {
  const res = await axios.get<{ data: FunnelDef[] }>(`${base}/api/marketing/funnels`, {
    headers: authHeader(token),
  });
  return res.data.data;
}

async function getFunnel(token: string, funnelId: number, traceId?: string): Promise<FunnelDef> {
  const res = await axios.get<{ data: FunnelDef }>(`${base}/api/marketing/funnels/${funnelId}`, {
    headers: authHeader(token),
    params: withTraceId({}, traceId),
  });
  return res.data.data;
}

async function createFunnel(token: string, name: string, type: FunnelType = "AUTOMATIC"): Promise<FunnelDef> {
  const res = await axios.post<{ data: FunnelDef }>(
    `${base}/api/marketing/funnels`,
    { name, type },
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function deleteFunnel(token: string, funnelId: number): Promise<void> {
  await axios.delete(`${base}/api/marketing/funnels/${funnelId}`, {
    headers: authHeader(token),
  });
}

// ── Stage CRUD ───────────────────────────────────────────────────────────────

async function createStage(
  token: string,
  funnelId: number,
  name: string,
  color: string,
): Promise<FunnelStageDef> {
  const res = await axios.post<{ data: FunnelStageDef }>(
    `${base}/api/marketing/funnels/${funnelId}/stages`,
    { name, color },
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function deleteStage(token: string, funnelId: number, stageId: number): Promise<void> {
  await axios.delete(`${base}/api/marketing/funnels/${funnelId}/stages/${stageId}`, {
    headers: authHeader(token),
  });
}

// ── Config (stage conditions) ────────────────────────────────────────────────

async function getConfig(token: string, funnelId: number): Promise<FunnelConfigResult> {
  const res = await axios.get<{ data: FunnelConfigResult }>(
    `${base}/api/marketing/funnels/${funnelId}/config`,
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function addCondition(
  token: string,
  funnelId: number,
  stageId: number,
  type: StageConditionType,
  params?: Record<string, unknown>,
): Promise<StageCondition> {
  const res = await axios.post<{ data: StageCondition }>(
    `${base}/api/marketing/funnels/${funnelId}/stages/${stageId}/conditions`,
    { type, params },
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function removeCondition(
  token: string,
  funnelId: number,
  stageId: number,
  conditionId: number,
): Promise<void> {
  await axios.delete(
    `${base}/api/marketing/funnels/${funnelId}/stages/${stageId}/conditions/${conditionId}`,
    { headers: authHeader(token) },
  );
}

async function saveConditionAsTemplate(
  token: string,
  funnelId: number,
  stageId: number,
  conditionId: number,
  name: string,
): Promise<ConditionTemplate> {
  const res = await axios.post<{ data: ConditionTemplate }>(
    `${base}/api/marketing/funnels/${funnelId}/stages/${stageId}/conditions/${conditionId}/save-as-template`,
    { name },
    { headers: authHeader(token) },
  );
  return res.data.data;
}

// ── Condition templates ───────────────────────────────────────────────────────

async function listTemplates(token: string): Promise<ConditionTemplate[]> {
  const res = await axios.get<{ data: ConditionTemplate[] }>(
    `${base}/api/marketing/condition-templates`,
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function createTemplate(
  token: string,
  name: string,
  type: StageConditionType,
  params?: Record<string, unknown>,
): Promise<ConditionTemplate> {
  const res = await axios.post<{ data: ConditionTemplate }>(
    `${base}/api/marketing/condition-templates`,
    { name, type, params },
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function deleteTemplate(token: string, templateId: number): Promise<void> {
  await axios.delete(`${base}/api/marketing/condition-templates/${templateId}`, {
    headers: authHeader(token),
  });
}

// ── Board + snapshot ─────────────────────────────────────────────────────────

async function getBoard(
  token: string,
  funnelId: number,
  previewPerStage = 10,
  filters?: FunnelBoardFilters,
): Promise<FunnelBoard | null> {
  const res = await axios.get<{ data: FunnelBoard | null }>(
    `${base}/api/marketing/funnels/${funnelId}/board`,
    { params: buildBoardParams(previewPerStage, filters), headers: authHeader(token) },
  );
  return res.data.data;
}

async function getBoardSummary(
  token: string,
  funnelId: number,
  filters?: FunnelBoardFilters,
  traceId?: string,
): Promise<FunnelBoard | null> {
  const res = await axios.get<{ data: FunnelBoard | null }>(
    `${base}/api/marketing/funnels/${funnelId}/board-summary`,
    { params: withTraceId(filters ?? {}, traceId), headers: authHeader(token) },
  );
  return res.data.data;
}

async function getClientsByStage(
  token: string,
  funnelId: number,
  stageId: number,
  page: number,
  perPage: number,
  filters?: FunnelBoardFilters,
  traceId?: string,
): Promise<FunnelClientsResponse> {
  const res = await axios.get<{ data: FunnelClientsResponse }>(
    `${base}/api/marketing/funnels/${funnelId}/clients`,
    { params: withTraceId(buildClientsParams(stageId, page, perPage, filters), traceId), headers: authHeader(token) },
  );
  return res.data.data;
}

async function triggerSnapshot(token: string, funnelId: number): Promise<{ snapshotId: number }> {
  const res = await axios.post<{ data: { snapshotId: number } }>(
    `${base}/api/marketing/funnels/${funnelId}/snapshot`,
    {},
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function getSnapshotStatus(
  token: string,
  funnelId: number,
  snapshotId: number,
): Promise<FunnelSnapshotStatusResponse> {
  const res = await axios.get<{ data: FunnelSnapshotStatusResponse }>(
    `${base}/api/marketing/funnels/${funnelId}/snapshot/${snapshotId}/status`,
    { headers: authHeader(token) },
  );
  return res.data.data;
}

// ── Manual entries ────────────────────────────────────────────────────────────

async function searchCustomers(
  token: string,
  funnelId: number,
  q: string,
): Promise<FunnelCard[]> {
  const res = await axios.get<{ data: FunnelCard[] }>(
    `${base}/api/marketing/funnels/${funnelId}/search-customers`,
    { params: { q }, headers: authHeader(token) },
  );
  return res.data.data;
}

async function addManualEntry(
  token: string,
  funnelId: number,
  stageId: number,
  ccId: number,
): Promise<FunnelCard & { entryId: number }> {
  const res = await axios.post<{ data: FunnelCard & { entryId: number } }>(
    `${base}/api/marketing/funnels/${funnelId}/manual-entries`,
    { stageId, ccId },
    { headers: authHeader(token) },
  );
  return res.data.data;
}

async function removeManualEntry(
  token: string,
  funnelId: number,
  entryId: number,
): Promise<void> {
  await axios.delete(
    `${base}/api/marketing/funnels/${funnelId}/manual-entries/${entryId}`,
    { headers: authHeader(token) },
  );
}

async function moveManualEntry(
  token: string,
  funnelId: number,
  entryId: number,
  stageId: number,
): Promise<void> {
  await axios.patch(
    `${base}/api/marketing/funnels/${funnelId}/manual-entries/${entryId}`,
    { stageId },
    { headers: authHeader(token) },
  );
}

// ── Filter options ────────────────────────────────────────────────────────────

export interface FunnelFilterOptions {
  groups: { code: number; name: string }[];
  operators: { code: number; name: string }[];
  campaigns: { code: number; name: string }[];
  segments: { code: number; name: string }[];
}

async function getFunnelFilterOptions(token: string, funnelId: number): Promise<FunnelFilterOptions> {
  const res = await axios.get<{ data: FunnelFilterOptions }>(
    `${base}/api/marketing/funnels/${funnelId}/filter-options`,
    { headers: authHeader(token) },
  );
  return res.data.data;
}

const funnelApiService = {
  listFunnels,
  getFunnel,
  createFunnel,
  deleteFunnel,
  createStage,
  deleteStage,
  getConfig,
  addCondition,
  removeCondition,
  saveConditionAsTemplate,
  listTemplates,
  createTemplate,
  deleteTemplate,
  getBoardSummary,
  getBoard,
  getClientsByStage,
  triggerSnapshot,
  getSnapshotStatus,
  searchCustomers,
  addManualEntry,
  removeManualEntry,
  moveManualEntry,
  getFunnelFilterOptions,
};

export default funnelApiService;
