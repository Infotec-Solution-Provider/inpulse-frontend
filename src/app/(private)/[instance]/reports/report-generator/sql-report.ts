export interface SqlReport {
  id: string;
  description: string;
  sql: string;
  createdAt: string;
  status: "pending" | "completed" | "failed";
  resultUrl?: string;
}
