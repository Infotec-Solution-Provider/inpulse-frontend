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
      return {
        ...next,
        filters: {
          ...next.filters,
          page: action.page.toString()
        }
      };
    case "change-per-page":
      return {
        ...next,
        filters: {
          ...next.filters,
          perPage: action.perPage.toString(),
          page: '1' // Reset para a primeira página ao mudar itens por página
        }
      };
    case "change-total-rows":
      next.totalRows = action.totalRows;
      return { ...next, totalRows: action.totalRows };
    case "change-filters":
      next.filters = { page: prev.filters.page, perPage: prev.filters.perPage, ...action.filters };
      return next;
    case "load-customers":
      next.customers = action.customers;
      return next;
    case "update-customer":
      next.customers = next.customers.map((customer) => {
        if (customer.CODIGO === action.id) {
          return { ...customer, ...action.data };
        }
        return customer;
      });
      return next;
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
