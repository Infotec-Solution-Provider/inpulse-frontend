import { WhatsappClient } from "@in.pulse-crm/sdk";

declare module "@in.pulse-crm/sdk" {
  interface WhatsappClient {
    searchMonitorData(params: {
      page?: number;
      pageSize?: number;
      filters?: Record<string, any>;
    }): Promise<{ items: any[]; totalCount: number }>;
  }
}
