import {
  AlertCircle,
  ArrowDownUp,
  ArrowLeft,
  ArrowRightLeft,
  CalendarClock,
  Check,
  ChevronDown,
  CircleX,
  Clock3,
  Ellipsis,
  Eye,
  Info,
  LayoutGrid,
  List,
  MapPin,
  MessagesSquare,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  SearchX,
  SlidersHorizontal,
  UserRound,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/** Stable functional vocabulary; navigation can supply its existing Lucide glyph. */
export const uiIcons = {
  view: Eye,
  edit: Pencil,
  filter: SlidersHorizontal,
  search: Search,
  refresh: RefreshCw,
  more: Ellipsis,
  close: X,
  back: ArrowLeft,
  list: List,
  cards: LayoutGrid,
  clock: Clock3,
  calendar: CalendarClock,
  transfer: ArrowRightLeft,
  finish: Check,
  phone: Phone,
  conversations: MessagesSquare,
  info: Info,
  error: AlertCircle,
  empty: SearchX,
  clear: CircleX,
  operator: UserRound,
  location: MapPin,
  sort: ArrowDownUp,
  chevronDown: ChevronDown,
  pause: Pause,
  play: Play,
  add: Plus,
  delete: Trash2,
} as const;

export const uiIconMetrics = {
  strokeWidth: 2,
  sizes: { metadata: 16, row: 18, toolbar: 20, navigation: 20, empty: 28 },
} as const;
export type UiIconName = keyof typeof uiIcons;
export type UiIconScale = keyof typeof uiIconMetrics.sizes;
export type UiIconProps = Omit<LucideProps, "size" | "strokeWidth" | "name"> & {
  scale?: UiIconScale;
} & ({ name: UiIconName; icon?: never } | { icon: LucideIcon; name?: never });

/** The button owns its accessible name. Standalone meaningful glyphs can supply one. */
export function UiIcon({ name, icon, scale = "row", className, ...props }: UiIconProps) {
  const Glyph = icon ?? uiIcons[name!];
  return (
    <Glyph
      {...props}
      size={uiIconMetrics.sizes[scale]}
      strokeWidth={uiIconMetrics.strokeWidth}
      focusable="false"
      aria-hidden={props["aria-hidden"] ?? !props["aria-label"]}
      className={"ip-icon ip-icon--" + scale + (className ? " " + className : "")}
    />
  );
}
