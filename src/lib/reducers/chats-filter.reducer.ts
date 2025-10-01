export type ShowingMessagesType = "all" | "unread" | "scheduled" | "internal" | "external";

export interface ChatsFiltersState {
  showingType: ShowingMessagesType;
  search: string;
  sortBy: "lastMessage" | "startedAt" | "finishedAt" | "userCreator";
  sortOrder: "asc" | "desc";
}

type ChangeShowingTypeAction = { type: "change-showing-type"; showingType: ShowingMessagesType };
type ChangeSearchAction = { type: "change-search"; search: string };
type ResetFiltersAction = { type: "reset-filters" };
type ChangeSortByAction = { type: "change-sort-by"; sortBy: ChatsFiltersState["sortBy"] };
type ChangeSortOrderAction = { type: "change-sort-order"; sortOrder: ChatsFiltersState["sortOrder"] };

export type ChangeFiltersAction =
  | ChangeShowingTypeAction
  | ChangeSearchAction
  | ResetFiltersAction
  | ChangeSortByAction
  | ChangeSortOrderAction;

export default function chatsFilterReducer(
  state: ChatsFiltersState,
  action: ChangeFiltersAction,
): ChatsFiltersState {
  switch (action.type) {
    case "change-showing-type":
      return { ...state, showingType: action.showingType };
    case "change-search":
      return { ...state, search: action.search };
    case "change-sort-by":
      return { ...state, sortBy: action.sortBy };
    case "change-sort-order":
      return { ...state, sortOrder: action.sortOrder };
    case "reset-filters":
      return { showingType: "all", search: "", sortBy: "lastMessage", sortOrder: "desc" };
    default:
      return state;
  }
}
