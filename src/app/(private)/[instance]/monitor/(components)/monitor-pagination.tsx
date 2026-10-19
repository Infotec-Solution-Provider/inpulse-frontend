"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import useMonitorContext from "../context";

export default function MonitorPagination() {
  const { page, setPage, pageSize, setPageSize, totalCount, isLoading } = useMonitorContext();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <nav
      aria-label="Paginação da monitoria"
      className="ip-results-footer mt-2 flex flex-wrap items-center justify-between gap-3 border-t py-3"
      style={{ borderColor: "var(--ip-border)" }}
    >
      <TextField
        select
        size="small"
        label="Por página"
        value={pageSize}
        sx={{ minWidth: 96, my: 0.5, "& .MuiSelect-select": { py: 0.5 } }}
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
              <ChevronLeft size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <p className="ip-muted text-sm tabular-nums">
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
              <ChevronRight size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    </nav>
  );
}
