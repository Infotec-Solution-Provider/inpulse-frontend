import { WppContact } from "@in.pulse-crm/sdk";

export type ContactWithSectors = WppContact & { sectors?: Array<{ sectorId: number }> };

export interface ContactsFilters {
  page: string;
  perPage: string;
  id?: string;
  name?: string;
  phone?: string;
  customerName?: string;
  customerId?: string;
  searchField?: string;
  searchTerm?: string;
  sectorIds?: number[];
}

// State Type
export interface ContactsContextState {
  contacts: ContactWithSectors[];
  totalRows: number;
  filters: ContactsFilters;
  isLoading: boolean;
}

// Action Types
type ChangeLoadingAction = { type: "change-loading"; isLoading: boolean };
type ChangePageAction = { type: "change-page"; page: number };
type ChangePerPageAction = { type: "change-per-page"; perPage: number };
type ChangeTotalRowsAction = { type: "change-total-rows"; totalRows: number };
type FilterKey = Exclude<keyof ContactsFilters, "page" | "perPage" | "sectorIds">;
type ChangeFilterAction = { type: "change-filter"; key: FilterKey; value?: string };
type RemoveFilterAction = { type: "remove-filter"; key: FilterKey };
type ClearFiltersAction = { type: "clear-filters" };
type SetSectorFilterAction = { type: "set-sector-filter"; sectorIds: number[] };
type LoadContactsAction = {
  type: "load-contacts";
  contacts: ContactWithSectors[];
  totalRows?: number;
};
type UpdateContactAction = { type: "update-contact"; id: number; name: string };
type AddContactAction = { type: "add-contact"; data: ContactWithSectors };
type DeleteContactAction = { type: "delete-contact"; id: number };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFilterAction | RemoveFilterAction | ClearFiltersAction;
type ContactActions =
  | LoadContactsAction
  | UpdateContactAction
  | AddContactAction
  | DeleteContactAction;

export type MultipleActions = {
  type: "multiple";
  actions: ChangeContactsStateAction[];
};

export type ChangeContactsStateAction =
  | PaginationActions
  | FilterActions
  | ContactActions
  | SetSectorFilterAction
  | ChangeLoadingAction;

// Reducer Function
export default function contactsReducer(
  prev: ContactsContextState,
  action: ChangeContactsStateAction | MultipleActions,
): ContactsContextState {
  switch (action.type) {
    case "change-loading":
      return { ...prev, isLoading: action.isLoading };
    case "change-page":
      // MUI uses 0-based pages, backend uses 1-based, so we add 1
      return { ...prev, filters: { ...prev.filters, page: (action.page + 1).toString() } };
    case "change-per-page":
      // Reset to page 1 when changing items per page
      return {
        ...prev,
        filters: { ...prev.filters, perPage: action.perPage.toString(), page: "1" },
      };
    case "change-total-rows":
      return { ...prev, totalRows: action.totalRows };
    case "change-filter":
      return {
        ...prev,
        filters: {
          ...prev.filters,
          [action.key]: action.value || undefined,
          page: "1",
        },
      };
    case "clear-filters":
      return {
        ...prev,
        filters: {
          page: "1",
          perPage: prev.filters.perPage,
          sectorIds: [],
        },
      };
    case "remove-filter":
      return {
        ...prev,
        filters: {
          ...prev.filters,
          [action.key]: undefined,
          page: "1",
        },
      };
    case "set-sector-filter":
      return {
        ...prev,
        filters: {
          ...prev.filters,
          sectorIds: action.sectorIds,
          page: "1",
        },
      };
    case "load-contacts":
      return {
        ...prev,
        contacts: action.contacts,
        totalRows: typeof action.totalRows === "number" ? action.totalRows : prev.totalRows,
      };
    case "update-contact":
      return {
        ...prev,
        contacts: prev.contacts.map((contact) => {
          if (contact.id === action.id) {
            return { ...contact, name: action.name };
          }
          return contact;
        }),
      };
    case "add-contact":
      return {
        ...prev,
        contacts: [action.data, ...prev.contacts],
        totalRows: prev.totalRows + 1,
      };
    case "delete-contact":
      return {
        ...prev,
        contacts: prev.contacts.filter((contact) => contact.id !== action.id),
        totalRows: Math.max(0, prev.totalRows - 1),
      };
    case "multiple":
      return action.actions.reduce((state, subAction) => contactsReducer(state, subAction), prev);
    default:
      return prev;
  }
}
