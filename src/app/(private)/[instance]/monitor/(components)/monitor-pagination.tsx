"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import useMonitorContext from "../context";

export default function MonitorPagination() {
  const { page, setPage, pageSize, setPageSize, totalCount, isLoading } = useMonitorContext();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <nav
      aria-label="Paginação da monitoria"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800"
    >
      <TextField
        select
        size="small"
        label="Por página"
        value={pageSize}
        sx={{ minWidth: 112 }}
        onChange={(event) => setPageSize(Number(event.target.value))}
      >
        {[20, 50, 100].map((size) => (
          <MenuItem key={size} value={size}>
            {size}
          </MenuItem>
        ))}
      </TextField>
      <div className="flex items-center gap-2">
        <Tooltip title="Página anterior">
          <span>
            <IconButton
              aria-label="Página anterior"
              size="small"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeftIcon />
            </IconButton>
          </span>
        </Tooltip>
        <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          Página <span className="font-semibold">{page}</span> de {totalPages}
        </p>
        <Tooltip title="Próxima página">
          <span>
            <IconButton
              aria-label="Próxima página"
              size="small"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              <ChevronRightIcon />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </nav>
  );
}
