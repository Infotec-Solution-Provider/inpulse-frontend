"use client";

import { FilterAlt, FilterAltOff, Search } from "@mui/icons-material";
import {
  Chip,
  IconButton,
  SxProps,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Theme,
  Tooltip,
} from "@mui/material";
import { useState } from "react";
import { useContactsContext } from "../contacts-context";
import { CONTACTS_TABLE_COLUMNS } from "./table-config";

const textFieldStlye: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
  },
};

const textFieldClassName = "w-full bg-slate-200 dark:bg-slate-700";

export default function ContactsTableHeader() {
  const { dispatch, state } = useContactsContext();
  const [filters, setFilters] = useState<Record<string, string>>(state.filters || {});

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== "page" && key !== "perPage" && filters[key] && filters[key] !== "none",
  ).length;

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
  };

  const onClearFilters = () => {
    setFilters({});
    dispatch({ type: "change-filters", filters: {} });
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
            width: CONTACTS_TABLE_COLUMNS.ID.width,
            minWidth: CONTACTS_TABLE_COLUMNS.ID.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.ID.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.ID.placeholder}
              value={filters.id || ""}
              onChange={(e) => onChangeFilter("id", e.target.value)}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.NAME.width,
            minWidth: CONTACTS_TABLE_COLUMNS.NAME.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.NAME.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.NAME.placeholder}
              value={filters.name || ""}
              onChange={(e) => onChangeFilter("name", e.target.value)}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.PHONE.width,
            minWidth: CONTACTS_TABLE_COLUMNS.PHONE.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.PHONE.label}
            </label>
            <TextField
              variant="outlined"
              size="small"
              placeholder={CONTACTS_TABLE_COLUMNS.PHONE.placeholder}
              value={filters.phone || ""}
              onChange={(e) => onChangeFilter("phone", e.target.value)}
              onKeyDown={handleKeyPress}
              className={textFieldClassName}
              sx={textFieldStlye}
            />
          </div>
        </TableCell>
        <TableCell
          className="px-3"
          sx={{
            width: CONTACTS_TABLE_COLUMNS.ACTIONS.width,
            minWidth: CONTACTS_TABLE_COLUMNS.ACTIONS.width,
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {CONTACTS_TABLE_COLUMNS.ACTIONS.label}
            </label>
            <div className="flex min-h-[40px] w-32 items-center gap-1">
              <Tooltip title="Pesquisar" arrow>
                <IconButton
                  onClick={onClickSearch}
                  size="small"
                  color="primary"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                >
                  <Search fontSize="small" />
                </IconButton>
              </Tooltip>
              {activeFiltersCount > 0 ? (
                <>
                  <Tooltip title="Limpar filtros" arrow>
                    <IconButton
                      onClick={onClearFilters}
                      size="small"
                      color="error"
                      className="bg-red-500 text-white hover:bg-red-600 dark:bg-red-800 dark:hover:bg-red-700"
                    >
                      <FilterAltOff fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Chip
                    icon={<FilterAlt fontSize="small" />}
                    label={activeFiltersCount}
                    size="small"
                    color="primary"
                  />
                </>
              ) : (
                <div className="w-[88px]" />
              )}
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableHead>
  );
}
