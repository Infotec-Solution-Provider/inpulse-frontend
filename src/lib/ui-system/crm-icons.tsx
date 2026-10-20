"use client";
import { SvgIcon, type SvgIconProps } from "@mui/material";
import { forwardRef } from "react";
import {
  Archive as IconArchive,
  ArchiveRestore as IconArchiveRestore,
  CircleStop as IconCircleStop,
  CircleAlert as IconCircleAlert,
  TriangleAlert as IconTriangleAlert,
  Download as IconDownload,
  Ban as IconBan,
  Smile as IconSmile,
  Send as IconSend,
  LayoutDashboard as IconLayoutDashboard,
  Play as IconPlay,
  ChartNoAxesCombined as IconAssessment,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft as IconArrowLeft,
  ArrowRight as IconArrowRight,
  Bookmark as IconBookmark,
  Bot as IconBot,
  BrainCircuit as IconBrainCircuit,
  ChartNoAxesCombined as IconChartNoAxesCombined,
  Check as IconCheck,
  ChevronDown as IconChevronDown,
  ChevronUp as IconChevronUp,
  CircleCheck as IconCircleCheck,
  CircleX as IconCircleX,
  Columns3 as IconColumns3,
  Eye as IconEye,
  FileAudio as IconFileAudio,
  FileText as IconFileText,
  FileVideo as IconFileVideo,
  Filter as IconFilter,
  FilterX as IconFilterX,
  Hand as IconHand,
  History as IconHistory,
  Image as IconImage,
  Info as IconInfo,
  KeyRound as IconKeyRound,
  ListFilter as IconListFilter,
  LoaderCircle as IconLoaderCircle,
  MessageCircle as IconMessageCircle,
  Paperclip as IconPaperclip,
  Pencil as IconPencil,
  Phone as IconPhone,
  PiggyBank as IconPiggyBank,
  Plus as IconPlus,
  QrCode as IconQrCode,
  RefreshCw as IconRefreshCw,
  RotateCcw as IconRotateCcw,
  Save as IconSave,
  ScanSearch as IconScanSearch,
  Search as IconSearch,
  Settings as IconSettings,
  SlidersHorizontal as IconSlidersHorizontal,
  Sparkles as IconSparkles,
  Square as IconSquare,
  SquareCheck as IconSquareCheck,
  Trash2 as IconTrash2,
  UserMinus as IconUserMinus,
  UserPlus as IconUserPlus,
  Users as IconUsers,
  UsersRound as IconUsersRound,
  X as IconX,
} from "lucide-react";

/** Retain MUI size/sx contracts while adopting the common outlined icon family. */
function controlIcon(Icon: LucideIcon) {
  return forwardRef<SVGSVGElement, SvgIconProps>(function CrmControlIcon(props, ref) {
    return (
      <SvgIcon
        ref={ref}
        component={Icon}
        inheritViewBox
        {...props}
        sx={[{ fill: "none" }, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]}
      />
    );
  });
}
export const Add = controlIcon(IconPlus);
export const ArrowBack = controlIcon(IconArrowLeft);
export const ArrowForward = controlIcon(IconArrowRight);
export const AttachFile = controlIcon(IconPaperclip);
export const AudioFile = controlIcon(IconFileAudio);
export const AutoAwesome = controlIcon(IconSparkles);
export const Autorenew = controlIcon(IconRefreshCw);
export const BookmarkBorder = controlIcon(IconBookmark);
export const CancelOutlined = controlIcon(IconCircleX);
export const CheckBox = controlIcon(IconSquareCheck);
export const CheckBoxOutlineBlank = controlIcon(IconSquare);
export const CheckCircle = controlIcon(IconCircleCheck);
export const CheckCircleOutline = controlIcon(IconCircleCheck);
export const CheckRounded = controlIcon(IconCheck);
export const Close = controlIcon(IconX);
export const Delete = controlIcon(IconTrash2);
export const DeleteOutline = controlIcon(IconTrash2);
export const Description = controlIcon(IconFileText);
export const Edit = controlIcon(IconPencil);
export const ExpandLess = controlIcon(IconChevronUp);
export const ExpandMore = controlIcon(IconChevronDown);
export const FilterAlt = controlIcon(IconFilter);
export const FilterAltOff = controlIcon(IconFilterX);
export const FilterList = controlIcon(IconListFilter);
export const Groups = controlIcon(IconUsersRound);
export const Groups2 = controlIcon(IconUsersRound);
export const History = controlIcon(IconHistory);
export const HourglassBottom = controlIcon(IconLoaderCircle);
export const Image = controlIcon(IconImage);
export const InfoOutlined = controlIcon(IconInfo);
export const Key = controlIcon(IconKeyRound);
export const ManageSearch = controlIcon(IconScanSearch);
export const ModelTraining = controlIcon(IconBrainCircuit);
export const PanToolAlt = controlIcon(IconHand);
export const PeopleAlt = controlIcon(IconUsers);
export const PersonAdd = controlIcon(IconUserPlus);
export const PersonAddAlt1 = controlIcon(IconUserPlus);
export const PersonRemove = controlIcon(IconUserMinus);
export const QrCode2 = controlIcon(IconQrCode);
export const QueryStats = controlIcon(IconChartNoAxesCombined);
export const Refresh = controlIcon(IconRefreshCw);
export const Replay = controlIcon(IconRotateCcw);
export const RestartAlt = controlIcon(IconRotateCcw);
export const Save = controlIcon(IconSave);
export const SavingsOutlined = controlIcon(IconPiggyBank);
export const Search = controlIcon(IconSearch);
export const Settings = controlIcon(IconSettings);
export const SettingsPhone = controlIcon(IconPhone);
export const SmartToyOutlined = controlIcon(IconBot);
export const Tune = controlIcon(IconSlidersHorizontal);
export const VideoFile = controlIcon(IconFileVideo);
export const ViewKanbanOutlined = controlIcon(IconColumns3);
export const Visibility = controlIcon(IconEye);
export const VpnKey = controlIcon(IconKeyRound);
export const WhatsApp = controlIcon(IconMessageCircle);

export const Cancel = controlIcon(IconBan);
export const EmojiEmotions = controlIcon(IconSmile);
export const Send = controlIcon(IconSend);

export const Dashboard = controlIcon(IconLayoutDashboard);
export const PlayArrow = controlIcon(IconPlay);
export const AssessmentOutlined = controlIcon(IconAssessment);

export const FileDownload = controlIcon(IconDownload);

export const ArchiveOutlined = controlIcon(IconArchive);
export const UnarchiveOutlined = controlIcon(IconArchiveRestore);

export const StopCircleOutlined = controlIcon(IconCircleStop);
export const ErrorOutlineRounded = controlIcon(IconCircleAlert);
export const WarningAmberRounded = controlIcon(IconTriangleAlert);
