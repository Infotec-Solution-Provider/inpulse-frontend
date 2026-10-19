import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, MenuItem, TextField } from "@mui/material";
import type useTelephonyMonitor from "../use-telephony-monitor";

export default function TelephonyPagination({
  state,
}: {
  state: ReturnType<typeof useTelephonyMonitor>;
}) {
  const totalPages = Math.max(1, Math.ceil(state.totalCount / state.pageSize));
  return (
    <nav
      aria-label="Paginação da telefonia"
      className="ip-results-footer flex shrink-0 flex-wrap items-center justify-between gap-3"
    >
      <TextField
        select
        size="small"
        label="Por página"
        value={state.pageSize}
        onChange={(event) => state.setPageSize(Number(event.target.value))}
        sx={{ minWidth: 96, my: 0.5, "& .MuiSelect-select": { py: 0.5 } }}
      >
        {[20, 50, 100].map((size) => (
          <MenuItem key={size} value={size}>
            {size}
          </MenuItem>
        ))}
      </TextField>
      <div className="ip-muted flex items-center gap-2 text-xs">
        <IconButton
          aria-label="Página anterior da telefonia"
          size="small"
          disabled={state.page <= 1 || state.isLoading}
          onClick={() => state.setPage((page) => Math.max(1, page - 1))}
        >
          <ChevronLeft size={17} />
        </IconButton>
        <p className="tabular-nums">
          Página {state.page} de {totalPages}
        </p>
        <IconButton
          aria-label="Próxima página da telefonia"
          size="small"
          disabled={state.page >= totalPages || state.isLoading}
          onClick={() => state.setPage((page) => Math.min(totalPages, page + 1))}
        >
          <ChevronRight size={17} />
        </IconButton>
      </div>
    </nav>
  );
}
