import { RequestFilters, WppContact } from "@in.pulse-crm/sdk";

// State Type
export interface ContactsContextState {
  contacts: WppContact[];
  totalRows: number;
  filters: RequestFilters<WppContact>;
  isLoading: boolean;
}

// Action Types
type ChangeLoadingAction = { type: "change-loading"; isLoading: boolean };
type ChangePageAction = { type: "change-page"; page: number };
type ChangePerPageAction = { type: "change-per-page"; perPage: number };
type ChangeTotalRowsAction = { type: "change-total-rows"; totalRows: number };
type ChangeFiltersAction = { type: "change-filters"; filters: RequestFilters<WppContact> };
type LoadContactsAction = { type: "load-contacts"; contacts: WppContact[] };
type UpdateContactAction = { type: "update-contact"; id: number; name: string };
type AddContactAction = { type: "add-contact"; data: WppContact };
type DeleteContactAction = { type: "delete-contact"; id: number };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFiltersAction;
type ContactActions = LoadContactsAction | UpdateContactAction | AddContactAction | DeleteContactAction;

type MultipleActions = {
  type: "multiple";
  actions: ChangeContactsStateAction[];
};

export type ChangeContactsStateAction =
  | PaginationActions
  | FilterActions
  | ContactActions
  | ChangeLoadingAction;

// Reducer Function
export default function contactsReducer(
  prev: ContactsContextState,
  action: ChangeContactsStateAction | MultipleActions,
): ContactsContextState {
  const next = { ...prev };

  switch (action.type) {
    case "change-loading":
      return { ...next, isLoading: action.isLoading };
    case "change-page":
      // MUI uses 0-based pages, backend uses 1-based, so we add 1
      return { ...next, filters: { ...next.filters, page: (action.page + 1).toString() } };
    case "change-per-page":
      // Reset to page 1 when changing items per page
      return { ...next, filters: { ...next.filters, perPage: action.perPage.toString(), page: "1" } };
    case "change-total-rows":
      next.totalRows = action.totalRows;
      return next;
    case "change-filters":
      // Reset to page 1 when applying new filters
      next.filters = { ...action.filters, page: "1", perPage: next.filters.perPage };
      return next;
    case "load-contacts":
      next.contacts = action.contacts;
      return next;
    case "update-contact":
      next.contacts = prev.contacts.map((contact) =>
        contact.id === action.id ? { ...contact, name: action.name } : contact,
      );
      return next;
    case "add-contact":
      next.contacts = [...prev.contacts, action.data];
      return next;
    case "delete-contact":
      next.contacts = prev.contacts.filter((contact) => contact.id !== action.id);
      return next;
    case "multiple":
      return action.actions.reduce(
        (state, subAction) => contactsReducer(state, subAction),
        prev,
      );
    default:
      return prev;
  }
}
