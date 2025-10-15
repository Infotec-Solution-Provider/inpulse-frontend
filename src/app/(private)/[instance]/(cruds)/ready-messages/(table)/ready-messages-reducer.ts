import { ReadyMessage, RequestFilters } from "@in.pulse-crm/sdk";

// State Type
export interface ReadyMessagesContextState {
  readyMessages: ReadyMessage[];
  totalRows: number;
  filters: RequestFilters<ReadyMessage>;
  isLoading: boolean;
}

// Action Types
type ChangeLoadingAction = { type: "change-loading"; isLoading: boolean };
type ChangePageAction = { type: "change-page"; page: number };
type ChangePerPageAction = { type: "change-per-page"; perPage: number };
type ChangeTotalRowsAction = { type: "change-total-rows"; totalRows: number };
type ChangeFilterAction = { type: "change-filter"; key: keyof ReadyMessage; value: string };
type RemoveFilterAction = { type: "remove-filter"; key: keyof ReadyMessage };
type ClearFiltersAction = { type: "clear-filters" };
type LoadReadyMessagesAction = { type: "load-ready-messages"; readyMessages: ReadyMessage[] };
type UpdateReadyMessageAction = { type: "update-ready-message"; id: number; data: Partial<ReadyMessage> };
type AddReadyMessageAction = { type: "add-ready-message"; data: ReadyMessage };
type DeleteReadyMessageAction = { type: "delete-ready-message"; id: number };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFilterAction | RemoveFilterAction | ClearFiltersAction;
type ReadyMessageActions = LoadReadyMessagesAction | UpdateReadyMessageAction | AddReadyMessageAction | DeleteReadyMessageAction;

export type MultipleActions = {
  type: "multiple";
  actions: ChangeReadyMessagesStateAction[];
};

export type ChangeReadyMessagesStateAction =
  | PaginationActions
  | FilterActions
  | ReadyMessageActions
  | ChangeLoadingAction;

// Reducer Function
export default function readyMessagesReducer(
  prev: ReadyMessagesContextState,
  action: ChangeReadyMessagesStateAction | MultipleActions,
): ReadyMessagesContextState {
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
    case "change-filter":
      next.filters[action.key] = action.value;
      return next;
    case "clear-filters":
      next.filters = { page: prev.filters.page, perPage: prev.filters.perPage };
      return next;
    case "remove-filter":
      delete next.filters[action.key];
      return next;
    case "load-ready-messages":
      next.readyMessages = action.readyMessages;
      return next;
    case "update-ready-message":
      return {
        ...next,
        readyMessages: next.readyMessages.map((readyMessage) => {
          if (readyMessage.id === action.id) {
            const updatedReadyMessage = { ...readyMessage, ...action.data } as ReadyMessage;
            return updatedReadyMessage;
          }
          return readyMessage;
        }),
      };
    case "add-ready-message":
      next.readyMessages.unshift(action.data);
      return next;
    case "delete-ready-message":
      return {
        ...next,
        readyMessages: next.readyMessages.filter((readyMessage) => readyMessage.id !== action.id),
      };
    case "multiple":
      let finalState = { ...prev };

      for (const a of action.actions) {
        finalState = readyMessagesReducer(finalState, a);
      }
      return finalState;
    default:
      return next;
  }
}
