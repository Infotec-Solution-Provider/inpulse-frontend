export type CustomerCrmValue = string | number | null;
export type CustomerCrmRecord = Record<string, CustomerCrmValue>;
export interface CustomerCrmField {
  name: string;
  label: string;
  group: "identification" | "address" | "phones" | "origin" | "administration";
  type: "text" | "integer" | "date" | "enum";
  nullable: boolean;
  maxLength?: number;
  required?: boolean;
  options?: string[];
  lookup?:
    | "customer-groups"
    | "origins"
    | "medias"
    | "units"
    | "segments"
    | "operators"
    | "positions"
    | "campaigns";
}
export interface CustomerCrmSnapshot {
  record: CustomerCrmRecord;
  version: string;
  writable: boolean;
  manualCode: boolean;
  fields: CustomerCrmField[];
}
export interface CustomerCrmFormOptions {
  customer: { fields: CustomerCrmField[]; manualCode: boolean };
  contact: { fields: CustomerCrmField[]; manualCode: boolean };
}
export interface CustomerCrmPatch {
  changes: CustomerCrmRecord;
  version: string;
}
export interface CustomerCrmBrandLink {
  record: CustomerCrmRecord;
  version: string;
  removable: boolean;
  brandName?: string | null;
}
export interface CustomerCrmLookupOption {
  id: string;
  label: string | null;
}
export interface CustomerCrmLookupResponse {
  data: CustomerCrmLookupOption[];
  page: { current: number; hasNext: boolean };
}
