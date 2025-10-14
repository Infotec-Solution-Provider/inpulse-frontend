import { InternalGroup } from "@in.pulse-crm/sdk";

// State Type
export interface InternalGroupsContextState {
  internalGroups: InternalGroup[];
  totalRows: number;
  filters: {
    page?: string;
    perPage?: string;
    groupName?: string;
    creatorId?: string;
  };
  isLoading: boolean;
}

// Action Types
type ChangeLoadingAction = { type: "change-loading"; isLoading: boolean };
type ChangePageAction = { type: "change-page"; page: number };
type ChangePerPageAction = { type: "change-per-page"; perPage: number };
type ChangeTotalRowsAction = { type: "change-total-rows"; totalRows: number };
type ChangeFiltersAction = { type: "change-filters"; filters: Record<string, string> };
type LoadInternalGroupsAction = { type: "load-internal-groups"; internalGroups: InternalGroup[] };
type UpdateInternalGroupAction = { 
  type: "update-internal-group"; 
  id: number; 
  data: Partial<InternalGroup>;
};
type AddInternalGroupAction = { type: "add-internal-group"; data: InternalGroup };
type DeleteInternalGroupAction = { type: "delete-internal-group"; id: number };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFiltersAction;
type InternalGroupActions = 
  | LoadInternalGroupsAction 
  | UpdateInternalGroupAction 
  | AddInternalGroupAction
  | DeleteInternalGroupAction;

type MultipleActions = {
  type: "multiple";
  actions: ChangeInternalGroupsStateAction[];
};

export type ChangeInternalGroupsStateAction =
  | PaginationActions
  | FilterActions
  | InternalGroupActions
  | ChangeLoadingAction;

// Reducer Function
export default function internalGroupsReducer(
  prev: InternalGroupsContextState,
  action: ChangeInternalGroupsStateAction | MultipleActions,
): InternalGroupsContextState {
  const next = { ...prev };

  switch (action.type) {
    case "change-loading":
      return { ...next, isLoading: action.isLoading };
    case "change-page":
      // MUI uses 0-based pages, backend uses 1-based, so we add 1
      next.filters.page = (action.page + 1).toString();
      return next;
    case "change-per-page":
      next.filters.perPage = action.perPage.toString();
      next.filters.page = "1"; // Reset to first page (backend uses 1-based)
      return next;
    case "change-total-rows":
      next.totalRows = action.totalRows;
      return { ...next, totalRows: action.totalRows };
    case "change-filters":
      next.filters = { 
        page: "1", // Reset to first page when applying filters
        perPage: prev.filters.perPage || "10", 
        ...action.filters 
      };
      return next;
    case "load-internal-groups":
      next.internalGroups = action.internalGroups;
      return next;
    case "update-internal-group":
      return {
        ...next,
        internalGroups: next.internalGroups.map((group) => {
          if (group.id === action.id) {
            return { ...group, ...action.data } as InternalGroup;
          }
          return group;
        })
      };
    case "add-internal-group":
      next.internalGroups.unshift(action.data);
      return next;
    case "delete-internal-group":
      next.internalGroups = next.internalGroups.filter(group => group.id !== action.id);
      return next;
    case "multiple":
      let finalState = { ...prev };

      for (const a of action.actions) {
        finalState = internalGroupsReducer(finalState, a);
      }
      return finalState;
    default:
      return next;
  }
}
