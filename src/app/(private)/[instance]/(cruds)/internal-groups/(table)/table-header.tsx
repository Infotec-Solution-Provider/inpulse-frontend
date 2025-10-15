import { FilterAltOff, Search } from "@mui/icons-material";
import {
  IconButton,
  SxProps,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useInternalGroupsContext } from "../internal-groups-context";
import { INTERNAL_GROUPS_TABLE_COLUMNS } from "./table-config";

const textFieldStyle: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function InternalGroupsTableHeader() {
  const { dispatch, loadInternalGroups, state } = useInternalGroupsContext();
  const [filters, setFilters] = useState<Record<string, string>>(state.filters || {});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  useEffect(() => {
    const activeCount = Object.keys(filters).filter(
      (key) => key !== "page" && key !== "perPage" && filters[key] && filters[key] !== "none",
    ).length;
    setHasActiveFilters(activeCount > 0);
  }, [filters]);

  const onChangeFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === "" || value === "none") {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  const onClickSearch = () => {
    dispatch({ type: "change-filters", filters });
    loadInternalGroups(filters);
  };

  const onClearFilters = () => {
    setFilters({});
    dispatch({ type: "change-filters", filters: {} });
    loadInternalGroups({});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onClickSearch();
    }
  };

  return (
    <TableHead>
      <TableRow
        className="bg-slate-200 dark:bg-slate-800"
        sx={{
          "& .MuiTableCell-root": {
            borderBottom: "2px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgb(71 85 105)" : "rgb(226 232 240)",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: (theme) => theme.palette.text.primary,
            paddingTop: "1rem",
            paddingBottom: "1rem",
          },
        }}
      >
        <TableCell
          className="px-3"
          sx={{
            width: INTERNAL_GROUPS_TABLE_COLUMNS.ID.width,
            minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.ID.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {INTERNAL_GROUPS_TABLE_COLUMNS.ID.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={INTERNAL_GROUPS_TABLE_COLUMNS.ID.placeholder}
              value={filters.id || ""}
              onChange={(e) => onChangeFilter("id", e.target.value)}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStyle}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.width,
            minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={INTERNAL_GROUPS_TABLE_COLUMNS.GROUP_NAME.placeholder}
              value={filters.groupName || ""}
              onChange={(e) => onChangeFilter("groupName", e.target.value)}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStyle}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.width,
            minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {INTERNAL_GROUPS_TABLE_COLUMNS.STARTED_AT.label}
            </label>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.width,
            minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {INTERNAL_GROUPS_TABLE_COLUMNS.CREATOR.label}
            </label>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: INTERNAL_GROUPS_TABLE_COLUMNS.PARTICIPANTS_COUNT.width,
            minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.PARTICIPANTS_COUNT.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {INTERNAL_GROUPS_TABLE_COLUMNS.PARTICIPANTS_COUNT.label}
            </label>
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: INTERNAL_GROUPS_TABLE_COLUMNS.ACTIONS.width,
            minWidth: INTERNAL_GROUPS_TABLE_COLUMNS.ACTIONS.width,
          }}
        >
          <div className="flex items-center justify-center gap-1">
            <Tooltip title="Buscar">
              <IconButton
                onClick={onClickSearch}
                size="small"
                className="text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
              >
                <Search fontSize="small" />
              </IconButton>
            </Tooltip>
            {hasActiveFilters && (
              <Tooltip title="Limpar filtros">
                <IconButton
                  onClick={onClearFilters}
                  size="small"
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <FilterAltOff fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
