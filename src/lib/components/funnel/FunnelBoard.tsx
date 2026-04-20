"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useFunnelContext } from "@/app/(private)/[instance]/(cruds)/funnel/[funnelId]/funnel-context";
import type { FunnelBoardColumn, FunnelCard as FunnelCardType } from "@/lib/types/funnel.types";
import FunnelCard from "./FunnelCard";
import AddCustomerDialog from "./AddCustomerDialog";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { Virtuoso } from "react-virtuoso";

// ── Column ────────────────────────────────────────────────────────────────────

interface ColumnProps {
  col: FunnelBoardColumn;
  isManual: boolean;
}

function Column({ col, isManual }: ColumnProps) {
  const { loadMoreClients, hasMore, loadingMore } = useFunnelContext();
  const isLoadingMore = loadingMore[col.stageId] ?? false;
  const canLoadMore = hasMore(col.stageId);
  const [dialogOpen, setDialogOpen] = useState(false);

  // dnd-kit drop target (only used in manual mode)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: col.stageId, disabled: !isManual });

  return (
    <div
      ref={setDropRef}
      className={`flex h-full min-w-[276px] max-w-[296px] flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 transition-colors dark:border-slate-700 dark:bg-slate-900/60 ${isManual && isOver ? "ring-2 ring-blue-400/70" : ""}`}
    >      {/* Column header */}
      <div
        className="flex-shrink-0 rounded-t-xl px-3 py-2.5"
        style={{ backgroundColor: col.color + "1a", borderBottom: `2px solid ${col.color}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: col.color }}
            />
            <span className="truncate text-sm font-bold" style={{ color: col.color }}>
              {col.stageName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: col.color }}
            >
              {col.total.toLocaleString("pt-BR")}
            </span>
            {isManual && (
              <Tooltip title="Adicionar cliente">
                <IconButton
                  size="small"
                  onClick={() => setDialogOpen(true)}
                  sx={{ width: 22, height: 22, color: col.color }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Card list */}
      {isManual ? (
        // For manual funnels: plain scrollable list (required for dnd-kit to work)
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-2">
          {col.clients.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">Nenhum cliente nesta etapa</p>
          ) : (
            col.clients.map((card) => (
              <FunnelCard key={card.ccId} card={card} stageId={col.stageId} />
            ))
          )}
        </div>
      ) : (
        col.clients.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Nenhum cliente nesta etapa</p>
        ) : (
          <Virtuoso
            style={{ flex: 1 }}
            data={col.clients}
            endReached={() => {
              if (canLoadMore && !isLoadingMore) loadMoreClients(col.stageId);
            }}
            itemContent={(_index, card) => (
              <div className="px-2 pt-2">
                <FunnelCard card={card} stageId={col.stageId} />
              </div>
            )}
            components={{
              Footer: () =>
                canLoadMore ? (
                  <div className="flex justify-center px-2 pb-3 pt-2">
                    {isLoadingMore ? (
                      <CircularProgress size={14} />
                    ) : (
                      <span className="text-[10px] text-slate-400">Role para carregar mais…</span>
                    )}
                  </div>
                ) : (
                  <div className="pb-2" />
                ),
            }}
          />
        )
      )}

      {isManual && (
        <AddCustomerDialog
          open={dialogOpen}
          stageId={col.stageId}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

export default function FunnelBoard() {
  const { columns, loading, loadBoard, funnelType, moveCard } = useFunnelContext();
  const isManual = funnelType === "MANUAL";

  // Track the card being dragged so we can render DragOverlay
  const [draggingCard, setDraggingCard] = useState<(FunnelCardType & { stageId: number }) | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const [entryIdStr, stageIdStr] = String(event.active.id).split(":");
    const entryId = Number(entryIdStr);
    const stageId = Number(stageIdStr);
    const col = columns.find((c) => c.stageId === stageId);
    const card = col?.clients.find((c) => c.entryId === entryId);
    if (card) setDraggingCard({ ...card, stageId });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingCard(null);
    const { active, over } = event;
    if (!over || !draggingCard) return;
    const toStageId = Number(over.id);
    if (isNaN(toStageId) || toStageId === draggingCard.stageId) return;
    if (draggingCard.entryId !== undefined) {
      void moveCard(draggingCard.entryId, draggingCard.stageId, toStageId);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (!isManual && columns.every((c) => c.total === 0 && c.clients.length === 0)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <p className="text-sm">Sem dados no pipeline. Configure os estágios e gere um snapshot.</p>
        <Button variant="outlined" size="small" onClick={loadBoard}>
          Recarregar
        </Button>
      </div>
    );
  }

  const board = (
    <div className="flex h-full gap-3 overflow-x-auto pb-2 pt-0.5">
      {columns.map((col) => (
        <Column key={col.stageId} col={col} isManual={isManual} />
      ))}
    </div>
  );

  if (!isManual) return board;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {board}
      <DragOverlay>
        {draggingCard && (
          <div className="opacity-80">
            <FunnelCard card={draggingCard} stageId={draggingCard.stageId} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

