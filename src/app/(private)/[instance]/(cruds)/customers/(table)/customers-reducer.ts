import { Customer, RequestFilters, UpdateCustomerDTO } from "@in.pulse-crm/sdk";

// State Type
export interface CustomersContextState {
  customers: Customer[];
  totalRows: number;
  filters: RequestFilters<Customer>;
  isLoading: boolean;
}

// Action Types
type ChanngeLoadingAction = { type: "change-loading"; isLoading: boolean };
type ChangePageAction = { type: "change-page"; page: number };
type ChangePerPageAction = { type: "change-per-page"; perPage: number };
type ChangeTotalRowsAction = { type: "change-total-rows"; totalRows: number };
type ChangeFilterAction = { type: "change-filter"; key: keyof Customer; value: string };
type RemoveFilterAction = { type: "remove-filter"; key: keyof Customer };
type ClearFiltersAction = { type: "clear-filters" };
type LoadCustomersAction = { type: "load-customers"; customers: Customer[] };
type UpdateCustomerAction = { type: "update-customer"; id: number; data: UpdateCustomerDTO };
type AddCustomerAction = { type: "add-customer"; data: Customer };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFilterAction | RemoveFilterAction | ClearFiltersAction;
type CustomerActions = LoadCustomersAction | UpdateCustomerAction | AddCustomerAction;

export type MultipleActions = {
  type: "multiple";
  actions: ChangeCustomersStateAction[];
};

export type ChangeCustomersStateAction =
  | PaginationActions
  | FilterActions
  | CustomerActions
  | ChanngeLoadingAction;

// Reducer Function
export default function customersReducer(
  prev: CustomersContextState,
  action: ChangeCustomersStateAction | MultipleActions,
): CustomersContextState {
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
    case "load-customers":
      next.customers = action.customers;
      return next;
    case "update-customer":
      return {
        ...next,
        customers: next.customers.map((customer) => {
          if (customer.CODIGO === action.id) {
            const updatedCustomer = { ...customer, ...action.data } as Customer;

            return updatedCustomer;
          }
          return customer;
        })
      };
    case "add-customer":
      next.customers.unshift(action.data);
      return next;
    case "multiple":
      let finalState = { ...prev };

      for (const a of action.actions) {
        finalState = customersReducer(finalState, a);
      }
      return finalState;
    default:
      return next;
  }
}
