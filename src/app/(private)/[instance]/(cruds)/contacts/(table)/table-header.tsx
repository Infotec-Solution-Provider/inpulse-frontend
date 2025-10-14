"use client";

import { FilterAlt, Search } from "@mui/icons-material";
import { Chip, IconButton, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import { useState } from "react";
import { useContactsContext } from "../contacts-context";
import { CONTACTS_TABLE_COLUMNS } from "./table-config";

export default function ContactsTableHeader() {
  const { state, dispatch } = useContactsContext();
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(state.filters);
  
  // Check if any filter is active (excluding pagination)
  const hasActiveFilters = Object.entries(localFilters).some(
    ([key, value]) => key !== "page" && key !== "perPage" && value && value.trim() !== ""
  );

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      onClickSearch();
    }
  };

  const onClickSearch = () => {
    dispatch({ type: "change-filters", filters: localFilters });
  };

  const onClearFilters = () => {
    const clearedFilters = { page: "1", perPage: state.filters.perPage || "10" };
    setLocalFilters(clearedFilters);
    dispatch({ type: "change-filters", filters: clearedFilters });
  };

  return (
    <TableHead className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-800">
      <TableRow>
        {CONTACTS_TABLE_COLUMNS.map((column) => (
          <TableCell
            key={column.key}
            align="left"
            style={{ width: column.width, minWidth: column.width }}
            className="font-semibold text-slate-700 dark:text-slate-200"
          >
            {column.label}
          </TableCell>
        ))}
      </TableRow>
      <TableRow>
        {CONTACTS_TABLE_COLUMNS.map((column) => (
          <TableCell
            key={`filter-${column.key}`}
            align="left"
            style={{ width: column.width, minWidth: column.width }}
            className="py-2"
          >
            {column.key === "ACTIONS" ? (
              <div className="flex items-center gap-1">
                <IconButton
                  onClick={onClickSearch}
                  size="small"
                  color="primary"
                  title="Aplicar filtros"
                >
                  <Search fontSize="small" />
                </IconButton>
                {hasActiveFilters && (
                  <Chip
                    icon={<FilterAlt fontSize="small" />}
                    label="Limpar"
                    size="small"
                    onClick={onClearFilters}
                    onDelete={onClearFilters}
                    color="primary"
                    variant="outlined"
                    className="h-7"
                  />
                )}
              </div>
            ) : "options" in column && column.options ? (
              <TextField
                select
                fullWidth
                size="small"
                value={localFilters[column.key.toLowerCase()] || ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, [column.key.toLowerCase()]: e.target.value })
                }
                onKeyPress={handleKeyPress}
                placeholder={column.placeholder}
                slotProps={{
                  select: {
                    native: true,
                  },
                }}
                className="bg-slate-50 dark:bg-slate-700"
              >
                <option value="">{column.placeholder || "Todos"}</option>
                {column.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </TextField>
            ) : (
              <TextField
                fullWidth
                size="small"
                value={localFilters[column.key.toLowerCase()] || ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, [column.key.toLowerCase()]: e.target.value })
                }
                onKeyPress={handleKeyPress}
                placeholder={column.placeholder}
                className="bg-slate-50 dark:bg-slate-700"
              />
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
