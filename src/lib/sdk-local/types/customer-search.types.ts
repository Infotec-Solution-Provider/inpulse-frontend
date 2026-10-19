export type CustomerSearchOptionKind = "groups" | "positions" | "origins" | "medias" | "brands" | "units" | "states";
export interface CustomerSearchOption { id: string; label: string | null }
export interface CustomerSearchOptionsResponse { data: CustomerSearchOption[]; page: { current: number; hasNext: boolean } }
export interface CustomerAdvancedSearchFilters {
  groupIds?: string; originIds?: string; mediaIds?: string; unitIds?: string;
  brandIds?: string; positionIds?: string; states?: string; phone?: string; email?: string;
  sortDirection?: "asc" | "desc";
}
