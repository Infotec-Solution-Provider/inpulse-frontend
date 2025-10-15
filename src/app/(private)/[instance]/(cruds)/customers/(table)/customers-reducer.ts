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
type ChangeFiltersAction = { type: "change-filters"; filters: RequestFilters<Customer> };
type LoadCustomersAction = { type: "load-customers"; customers: Customer[] };
type UpdateCustomerAction = { type: "update-customer"; id: number; data: UpdateCustomerDTO };
type AddCustomerAction = { type: "add-customer"; data: Customer };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFiltersAction;
type CustomerActions = LoadCustomersAction | UpdateCustomerAction | AddCustomerAction;

type MultipleActions = {
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
    case "change-filters":
      next.filters = { 
        page: "1", // Reset to first page when applying filters
        perPage: prev.filters.perPage || "10", 
        ...action.filters 
      };

      console.log(next.filters)
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
