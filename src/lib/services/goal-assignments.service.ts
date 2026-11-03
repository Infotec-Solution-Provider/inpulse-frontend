import axios from "axios";
const base = `${process.env["NEXT_PUBLIC_MARKETING_URL"] || "http://localhost:8007"}/api/marketing/financial/goal-assignments`;
export interface GoalAllocation {
  year: number;
  month: number;
  mode: "INDIVIDUAL" | "TOTAL";
  indicator: "targetRevenue" | "targetSalesCount" | "targetAvgTicket";
  amount: string;
  participants: number[];
}
export interface GoalParticipant {
  operadorId: number;
  name: string;
}
export interface GoalPreview {
  rows: Array<GoalParticipant & { value: number; previous: number | null }>;
  total: number;
  previewHash: string;
}
export interface GoalHistory {
  id: number;
  createdBy: number;
  createdAt: string;
  snapshot: { allocation: GoalAllocation; rows: GoalPreview["rows"]; total: number };
}
export class GoalAssignmentsClient {
  constructor(
    private readonly token: string,
    private readonly instance: string,
  ) {}
  private get config() {
    return { headers: { authorization: this.token, "x-crm-instance": this.instance } };
  }
  async participants(search: string, page: number) {
    const response = await axios.get<{ data: { data: GoalParticipant[]; hasNext: boolean } }>(
      `${base}/participants`,
      { ...this.config, params: { search, page } },
    );
    return response.data.data;
  }
  async preview(allocation: GoalAllocation) {
    const response = await axios.post<{ data: GoalPreview }>(
      `${base}/preview`,
      allocation,
      this.config,
    );
    return response.data.data;
  }
  async commit(allocation: GoalAllocation, previewHash: string, requestId: string) {
    await axios.post(base, { allocation, previewHash, requestId }, this.config);
  }
  async history(year: number, month: number, beforeId?: number) {
    const response = await axios.get<{ data: GoalHistory[] }>(base, {
      ...this.config,
      params: { year, month, beforeId },
    });
    return response.data.data;
  }
}
