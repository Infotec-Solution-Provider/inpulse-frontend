export interface OperatorDashboardMetrics {
  serverNow: string;
  crmDay: string;
  conversationSeconds: number;
  attempts: number;
  pauseSeconds: number;
  productivePauseSeconds: number;
  connectedSeconds: number | null;
  contacts: number | null;
  closedOrders: number | null;
  closedOrderValue: string | null;
  productivityPercent: number | null;
  quotesToClose: number | null;
  scheduledCustomers: number | null;
  overdueSchedules: number | null;
  expectedSeconds: number | null;
  expectedSource: "campaign" | "receptive" | null;
  minimumConversationSeconds: number | null;
  incompleteCalls: number;
  visibility: { orders: boolean; productivity: boolean };
  availability: Record<string, boolean>;
}
