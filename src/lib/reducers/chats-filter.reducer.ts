export type ShowingMessagesType = "all" | "unread" | "scheduled" | "internal";

export interface ChatsFiltersState {
  showingType: ShowingMessagesType;
  search: string;
}

type ChangeShowingTypeAction = { type: "change-showing-type"; showingType: ShowingMessagesType };
type ChangeSearchAction = { type: "change-search"; search: string };
type ResetFiltersAction = { type: "reset-filters" };

export type ChangeFiltersAction = ChangeShowingTypeAction | ChangeSearchAction | ResetFiltersAction;

export default function chatsFilterReducer(
  state: ChatsFiltersState,
  action: ChangeFiltersAction,
): ChatsFiltersState {
  switch (action.type) {
    case "change-showing-type":
      return { ...state, showingType: action.showingType };
    case "change-search":
      return { ...state, search: action.search };
    case "reset-filters":
      return { showingType: "all", search: "" };
    default:
      return state;
  }
}
