"use client";

import { useFunnelContext } from "@/app/(private)/[instance]/(cruds)/funnel/[funnelId]/funnel-context";
import type { FunnelBoardColumn } from "@/lib/types/funnel.types";
import FunnelCard from "./FunnelCard";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Virtuoso } from "react-virtuoso";

function Column({ col }: { col: FunnelBoardColumn }) {
  const { loadMoreClients, hasMore, loadingMore } = useFunnelContext();
  const isLoadingMore = loadingMore[col.stageId] ?? false;
  const canLoadMore = hasMore(col.stageId);

  return (
    <div className="flex h-full min-w-[276px] max-w-[296px] flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
      {/* Column header */}
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
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
            style={{ backgroundColor: col.color }}
          >
            {col.total.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* Card list */}
      {col.clients.length === 0 ? (
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
              <FunnelCard card={card} />
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
      )}
    </div>
  );
}

export default function FunnelBoard() {
  const { columns, loading, loadBoard } = useFunnelContext();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  if (columns.every((c) => c.total === 0 && c.clients.length === 0)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
        <p className="text-sm">Sem dados no pipeline. Configure os estágios e gere um snapshot.</p>
        <Button variant="outlined" size="small" onClick={loadBoard}>
          Recarregar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2 pt-0.5">
      {columns.map((col) => (
        <Column key={col.stageId} col={col} />
      ))}
    </div>
  );
}
