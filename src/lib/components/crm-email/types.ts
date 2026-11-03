export type Content = {
  kind: "INDIVIDUAL" | "CAMPAIGN" | "TEST";
  name: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  attachments: { name: string; content: string }[];
  excluded: string[];
};
export type Account = {
  id: string;
  scope: "GENERAL" | "INDIVIDUAL";
  version: number;
  fromEmail: string;
  fromName: string;
  active: boolean;
  host?: string;
  port?: number;
  username?: string;
};
export type Settings = {
  mode: "GENERAL" | "INDIVIDUAL" | null;
  version: number;
  accounts: Account[];
};
export type Preview = Omit<Content, "attachments"> & {
  attachments: { name: string; bytes: number }[];
  token: string;
  total: number;
  sender: { email: string; name: string; id: string };
};
export type Job = {
  id: string;
  name: string;
  kind: string;
  state: string;
  version: number;
  fromEmail: string;
  deliveries?: {
    id: string;
    recipient: string;
    state: string;
    errorCode: string | null;
    attempt: number;
  }[];
};
export type ImporterRow = { CODIGO: number; EMAIL: string; ATIVO: string };
export type Importer = {
  supported: boolean;
  writable: boolean;
  maxLength: number;
  reason: string | null;
  data: ImporterRow[];
  page: number;
  hasNext: boolean;
};
