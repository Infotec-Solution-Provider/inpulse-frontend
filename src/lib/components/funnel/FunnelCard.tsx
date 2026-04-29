"use client";
import { FunnelCard as IFunnelCard } from "@/lib/types/funnel.types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CampaignIcon from "@mui/icons-material/Campaign";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import GroupsIcon from "@mui/icons-material/Groups";
import LabelIcon from "@mui/icons-material/Label";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
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

  const draggableId = card.entryId !== undefined ? `${card.entryId}:${stageId}` : `static:${card.ccId}`;
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingHook } =
    useDraggable({ id: draggableId, disabled: !isManual || card.entryId === undefined });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDraggingHook ? 0.4 : 1 }
    : undefined;

  const handleClick = () => {
    if (isDragging) return;
    router.push(`/${instance}/customers?search=${encodeURIComponent(card.nome)}`);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.entryId !== undefined) {
      void removeManualEntry(card.entryId, stageId);
    }
  };

  const totalVendas = card.totalVendas ?? 0;

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
        {/* Row 1: Name + delete */}
        <div className="flex items-start justify-between gap-1.5">
          <span className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
            {card.nome}
          </span>
          {isManual && !isDragging && card.entryId !== undefined && (
            <IconButton
              size="small"
              onClick={handleRemove}
              className="shrink-0 opacity-0 group-hover:opacity-100"
              sx={{ width: 18, height: 18, mt: "-1px", color: "error.main" }}
            >
              <DeleteOutlineIcon style={{ fontSize: 12 }} />
            </IconButton>
          )}
        </div>

        {/* Row 2: Grupo + Segmento chips */}
        {(card.groupName ?? card.segmentName) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.groupName && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/25 dark:text-blue-300">
                <GroupsIcon style={{ fontSize: 9 }} />
                {card.groupName}
              </span>
            )}
            {card.segmentName && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/25 dark:text-violet-300">
                <LabelIcon style={{ fontSize: 9 }} />
                {card.segmentName}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Campanha + Operador */}
        {(card.campanha ?? card.operador) && (
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            {card.campanha && (
              <span className="flex min-w-0 items-center gap-1">
                <CampaignIcon style={{ fontSize: 11 }} className="shrink-0" />
                <span className="truncate">{card.campanha}</span>
              </span>
            )}
            {card.operador && (
              <span className="flex min-w-0 items-center gap-1">
                <SupportAgentIcon style={{ fontSize: 11 }} className="shrink-0" />
                <span className="truncate">{card.operador}</span>
              </span>
            )}
          </div>
        )}

        {/* Row 4: Stats (contacts + sales) + date */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {card.totalContatos > 0 && (
              <Tooltip title="Número de contatos" placement="bottom">
                <span className="flex cursor-default items-center gap-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <ChatBubbleOutlineIcon style={{ fontSize: 12 }} />
                  {card.totalContatos > 99 ? "99+" : card.totalContatos}
                </span>
              </Tooltip>
            )}
            {totalVendas > 0 && (
              <Tooltip title="Número de vendas" placement="bottom">
                <span className="flex cursor-default items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <ShoppingCartIcon style={{ fontSize: 12 }} />
                  {totalVendas > 99 ? "99+" : totalVendas}
                </span>
              </Tooltip>
            )}
          </div>

          {/* Date: scheduling takes priority over last contact */}
          {card.agendamento ? (
            <div className="flex shrink-0 items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
              <CalendarMonthIcon style={{ fontSize: 10 }} />
              <span>{formatDate(card.agendamento)}</span>
            </div>
          ) : card.ultimoContato ? (
            <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-600">
              {relativeDate(card.ultimoContato)}
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}

