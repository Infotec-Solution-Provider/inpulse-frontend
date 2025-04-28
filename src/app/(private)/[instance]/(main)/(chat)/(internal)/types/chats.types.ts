import { User } from "@in.pulse-crm/sdk";

export interface ChatGroup {
  id: number;
  name: string;
  members: User[];
  rules: GroupRule[];
  createdBy: User;
  createdAt: Date;
  isPrivate: boolean;
  avatarUrl?: string;
}

export interface GroupRule {
  type: 'permission' | 'content' | 'notification';
  value: string;
}

export type ChatType = 'individual' | 'group';

export interface ChatBase {
  id: number;
  chatType: ChatType;
  createdAt: Date;
  updatedAt: Date;
}


