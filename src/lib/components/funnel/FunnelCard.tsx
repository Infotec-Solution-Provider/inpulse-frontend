"use client";
import { FunnelCard as IFunnelCard } from "@/lib/types/funnel.types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import IconButton from "@mui/material/IconButton";
import { useParams, useRouter } from "next/navigation";
import { useFunnelContext } from "@/app/(private)/[instance]/(cruds)/funnel/[funnelId]/funnel-context";

interface Props {
  card: IFunnelCard;
  stageId: number;
  isDragging?: boolean;
}

function formatDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function relativeDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 30) return `há ${diff} dias`;
  if (diff < 365) return `há ${Math.floor(diff / 30)} meses`;
  return `há ${Math.floor(diff / 365)} anos`;
}

export default function FunnelCard({ card, stageId, isDragging = false }: Props) {
  const router = useRouter();
  const params = useParams();
  const instance = params["instance"] as string;
  const { funnelType, removeManualEntry } = useFunnelContext();
  const isManual = funnelType === "MANUAL";

  // dnd-kit draggable — only active for manual funnels with entryId
  const draggableId = card.entryId !== undefined ? `${card.entryId}:${stageId}` : `static:${card.ccId}`;
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingHook } =
    useDraggable({ id: draggableId, disabled: !isManual || card.entryId === undefined });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDraggingHook ? 0.4 : 1 }
    : undefined;

  const handleClick = () => {
    // Don't navigate when a drag just ended or during DragOverlay render
    if (isDragging) return;
    router.push(`/${instance}/customers?search=${encodeURIComponent(card.nome)}`);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.entryId !== undefined) {
      void removeManualEntry(card.entryId, stageId);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle — only for manual funnels */}
      {isManual && !isDragging && (
        <span
          {...listeners}
          {...attributes}
          className="absolute left-0 top-0 flex h-full w-5 cursor-grab items-center justify-center rounded-l-lg text-slate-300 hover:text-slate-400 active:cursor-grabbing"
        >
          <DragIndicatorIcon style={{ fontSize: 14 }} />
        </span>
      )}

      <button
        onClick={handleClick}
        className={`group w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 ${isManual ? "pl-5" : ""}`}
      >
        {/* Name row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <PersonIcon className="shrink-0 text-slate-400" style={{ fontSize: 13 }} />
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {card.nome}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {card.totalContatos > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                <ChatBubbleOutlineIcon style={{ fontSize: 10 }} />
                {card.totalContatos > 99 ? "99+" : card.totalContatos}
              </span>
            )}
            {/* Remove button for manual mode */}
            {isManual && !isDragging && card.entryId !== undefined && (
              <IconButton
                size="small"
                onClick={handleRemove}
                className="opacity-0 group-hover:opacity-100"
                sx={{ width: 18, height: 18, color: "error.main" }}
              >
                <DeleteOutlineIcon style={{ fontSize: 12 }} />
              </IconButton>
            )}
          </div>
        </div>

        {/* Phone */}
        {card.fone1 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <PhoneIcon style={{ fontSize: 11 }} />
            <span>{card.fone1}</span>
          </div>
        )}

        {/* Campaign */}
        {card.campanha && (
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <CampaignIcon style={{ fontSize: 11 }} />
            <span className="truncate">{card.campanha}</span>
          </div>
        )}

        {/* Operator */}
        {card.operador && (
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <SupportAgentIcon style={{ fontSize: 11 }} />
            <span className="truncate">{card.operador}</span>
          </div>
        )}

        {/* Scheduling */}
        {card.agendamento && (
          <div className="mt-1.5 flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
            <CalendarMonthIcon style={{ fontSize: 11 }} />
            <span>{formatDate(card.agendamento)}</span>
          </div>
        )}

        {/* Last contact */}
        {!card.agendamento && card.ultimoContato && (
          <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-600">
            {relativeDate(card.ultimoContato)}
          </div>
        )}
      </button>
    </div>
  );
}
