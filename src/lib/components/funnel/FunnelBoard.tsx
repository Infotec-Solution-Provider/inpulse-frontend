"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
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

// ── Column ────────────────────────────────────────────────────────────────────

interface ColumnProps {
  col: FunnelBoardColumn;
  isManual: boolean;
  position: number;
}

function Column({ col, isManual, position }: ColumnProps) {
  const { goToStagePage, pageState, loadingMore } = useFunnelContext();
  const isLoadingMore = loadingMore[col.stageId] ?? false;
  const [dialogOpen, setDialogOpen] = useState(false);
  const stagePageState = pageState[col.stageId];
  const currentPage = stagePageState?.page ?? 1;
  const totalPages = stagePageState
    ? Math.max(1, Math.ceil(stagePageState.totalRows / stagePageState.perPage))
    : 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // dnd-kit drop target (only used in manual mode)
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: col.stageId, disabled: !isManual });

  return (
    <div
      ref={setDropRef}
      className={`flex h-full w-[300px] min-w-[280px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/80 sm:min-w-[300px] ${isManual && isOver ? "-translate-y-0.5 border-blue-400 ring-2 ring-blue-400/30" : ""}`}
    >
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: col.color }} />
      {/* Column header */}
      <div className="flex-shrink-0 border-b border-slate-200/80 bg-white/90 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[10px] font-bold tabular-nums text-slate-400">
              {String(position).padStart(2, "0")}
            </span>
            <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {col.stageName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: col.color + "20", color: col.color }}
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
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2.5 py-2.5">
          {col.clients.length === 0 ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="m-1 flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 text-center text-xs text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-600 dark:border-slate-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
            >
              <AddIcon sx={{ fontSize: 18 }} />
              Adicione o primeiro cliente
            </button>
          ) : (
            col.clients.map((card) => (
              <FunnelCard key={card.ccId} card={card} stageId={col.stageId} />
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2.5 py-2.5">
            {col.clients.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Nenhum cliente nesta etapa</p>
            ) : (
              col.clients.map((card) => (
                <FunnelCard key={card.ccId} card={card} stageId={col.stageId} />
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-2 py-2 dark:border-slate-700">
            <Button
              size="small"
              variant="text"
              disabled={!canGoPrev || isLoadingMore}
              onClick={() => void goToStagePage(col.stageId, currentPage - 1)}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              {isLoadingMore && <CircularProgress size={12} />}
              <span>
                {currentPage} / {totalPages}
              </span>
            </div>
            <Button
              size="small"
              variant="text"
              disabled={!canGoNext || isLoadingMore}
              onClick={() => void goToStagePage(col.stageId, currentPage + 1)}
            >
              Próxima
            </Button>
          </div>
        </>
      )}

      {isManual && col.clients.length > 0 && (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="mx-2.5 mb-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        >
          <AddIcon sx={{ fontSize: 17 }} />
          Adicionar cliente
        </button>
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
  const [draggingCard, setDraggingCard] = useState<(FunnelCardType & { stageId: number }) | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
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
    <div className="flex h-full w-full items-start justify-start gap-3 overflow-x-auto pb-2 pt-0.5">
      {columns.map((col, index) => (
        <Column key={col.stageId} col={col} isManual={isManual} position={index + 1} />
      ))}
    </div>
  );

  if (!isManual) {
    return board;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingCard(null)}
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
