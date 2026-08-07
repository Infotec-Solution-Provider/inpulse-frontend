import { WhatsappClient } from "@/lib/sdk-local";

declare module "@/lib/sdk-local" {
  interface WhatsappClient {
    searchMonitorData(params: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, any>;
    }): Promise<{ items: any[]; totalCount: number }>;
  }
}
