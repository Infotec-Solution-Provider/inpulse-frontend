export interface AppNotification {
  id: number;
  title: string;
  description: string;
  instance: string;
  chatId?: number;
  userId?: number;
  type: string;
  read: boolean;
  createdAt: string;
}
