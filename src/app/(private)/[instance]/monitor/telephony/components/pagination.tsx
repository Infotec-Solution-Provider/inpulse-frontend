import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
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
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-800"
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
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <IconButton
          aria-label="Página anterior da telefonia"
          size="small"
          disabled={state.page <= 1 || state.isLoading}
          onClick={() => state.setPage((page) => Math.max(1, page - 1))}
        >
          <ChevronLeftIcon />
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
          <ChevronRightIcon />
        </IconButton>
      </div>
    </nav>
  );
}
