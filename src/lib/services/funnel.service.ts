import axios from "axios";
import type {
  ConditionTemplate,
  FunnelBoard,
  FunnelClientsResponse,
  FunnelConfigResult,
  FunnelDef,
  FunnelSnapshotStatusResponse,
  FunnelStageDef,
  StageCondition,
  StageConditionType,
} from "../types/funnel.types";

const base = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:8007";

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

// ── Funnel CRUD ──────────────────────────────────────────────────────────────

async function listFunnels(token: string): Promise<FunnelDef[]> {
  const res = await axios.get<{ data: FunnelDef[] }>(`${base}/api/marketing/funnels`, {
    headers: authHeader(token),
  });
  return res.data.data;
}

async function createFunnel(token: string, name: string): Promise<FunnelDef> {
  const res = await axios.post<{ data: FunnelDef }>(
    `${base}/api/marketing/funnels`,
    { name },
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
): Promise<FunnelBoard | null> {
  const res = await axios.get<{ data: FunnelBoard | null }>(
    `${base}/api/marketing/funnels/${funnelId}/board`,
    { params: { preview: previewPerStage }, headers: authHeader(token) },
  );
  return res.data.data;
}

async function getClientsByStage(
  token: string,
  funnelId: number,
  stageId: number,
  page: number,
  perPage: number,
): Promise<FunnelClientsResponse> {
  const res = await axios.get<{ data: FunnelClientsResponse }>(
    `${base}/api/marketing/funnels/${funnelId}/clients`,
    { params: { stageId, page, perPage }, headers: authHeader(token) },
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

const funnelApiService = {
  listFunnels,
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
  getBoard,
  getClientsByStage,
  triggerSnapshot,
  getSnapshotStatus,
};

export default funnelApiService;
