import { RequestFilters, UpdateUserDTO, User } from "@in.pulse-crm/sdk";

// State Type
export interface UsersContextState {
  users: User[];
  totalRows: number;
  filters: RequestFilters<User>;
  isLoading: boolean;
}

// Action Types
type ChangeLoadingAction = { type: "change-loading"; isLoading: boolean };
type ChangePageAction = { type: "change-page"; page: number };
type ChangePerPageAction = { type: "change-per-page"; perPage: number };
type ChangeTotalRowsAction = { type: "change-total-rows"; totalRows: number };
type ChangeFilterAction = { type: "change-filter"; key: keyof User; value: string };
type RemoveFilterAction = { type: "remove-filter"; key: keyof User };
type ClearFiltersAction = { type: "clear-filters" };
type LoadUsersAction = { type: "load-users"; users: User[] };
type UpdateUserAction = { type: "update-user"; id: number; data: UpdateUserDTO };
type AddUserAction = { type: "add-user"; data: User };

type PaginationActions = ChangePageAction | ChangePerPageAction | ChangeTotalRowsAction;
type FilterActions = ChangeFilterAction | RemoveFilterAction | ClearFiltersAction;
type UserActions = LoadUsersAction | UpdateUserAction | AddUserAction;

export type MultipleActions = {
  type: "multiple";
  actions: ChangeUsersStateAction[];
};

export type ChangeUsersStateAction =
  | PaginationActions
  | FilterActions
  | UserActions
  | ChangeLoadingAction;

// Reducer Function
export default function usersReducer(
  prev: UsersContextState,
  action: ChangeUsersStateAction | MultipleActions,
): UsersContextState {
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
    case "load-users":
      next.users = action.users;
      return next;
    case "update-user":
      return {
        ...next,
        users: next.users.map((user) => {
          if (user.CODIGO === action.id) {
            const updatedUser = { ...user, ...action.data } as User;
            return updatedUser;
          }
          return user;
        }),
      };
    case "add-user":
      next.users.unshift(action.data);
      return next;
    case "multiple":
      let finalState = { ...prev };

      for (const a of action.actions) {
        finalState = usersReducer(finalState, a);
      }
      return finalState;
    default:
      return next;
  }
}
