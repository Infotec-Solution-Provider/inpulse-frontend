export interface DashboardFilters {
  startDate: string;
  endDate: string;
  sectors: string;
  operators: string;
}

export interface SatisfactionSurveyAnalyticalRow {
  chatId: number;
  operatorId: number | null;
  operatorName: string | null;
  contactId: number | null;
  contactName: string | null;
  contactPhone: string | null;
  customerId: number | null;
  customerName: string | null;
  customerCnpj: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  answers: Record<
    "q1" | "q2" | "q3" | "q4",
    { question: string; rating: number | null; answerText: string | null }
  >;
}

export interface SatisfactionSurveySyntheticRow {
  questionKey: "q1" | "q2" | "q3" | "q4";
  questionLabel: string;
  averageScore: number | null;
  totalAnswers: number;
  distribution: Array<{ score: number; count: number }>;
}

export interface OperatorPerformanceSummary {
  periodStart: string | null;
  periodEnd: string | null;
  operatorsCount: number;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
  contactsCount: number;
  chatsHandledCount: number;
  chatsFinishedCount: number;
  pendingReturnsCount: number;
  transfersSentCount: number;
  transfersReceivedCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
}

export interface OperatorPerformanceDailySeriesRow {
  date: string;
  label: string;
  previousDate: string | null;
  messagesCount: number;
  chatsFinishedCount: number;
  pendingReturnsCount: number;
  transfersSentCount: number;
  transfersReceivedCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
  previousMessagesCount: number;
  previousChatsFinishedCount: number;
  previousPendingReturnsCount: number;
  previousTransfersSentCount: number;
  previousTransfersReceivedCount: number;
  previousAverageFirstResponseSeconds: number | null;
  previousAverageHandlingSeconds: number | null;
}

export interface OperatorPerformanceRow {
  userId: number;
  userName: string;
  userActive: string | number | null;
  userType: string | number | null;
  userSector: string | null;
  messagesCount: number;
  sentMessagesCount: number;
  receivedMessagesCount: number;
  contactsCount: number;
  chatsHandledCount: number;
  chatsFinishedCount: number;
  respondedChatsCount: number;
  pendingReturnsCount: number;
  transfersSentCount: number;
  transfersReceivedCount: number;
  averageFirstResponseSeconds: number | null;
  averageHandlingSeconds: number | null;
  previousMessagesCount: number;
  previousChatsFinishedCount: number;
  previousPendingReturnsCount: number;
  previousTransfersSentCount: number;
  previousTransfersReceivedCount: number;
  previousAverageFirstResponseSeconds: number | null;
  previousAverageHandlingSeconds: number | null;
}
