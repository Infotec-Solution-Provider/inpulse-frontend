import { MenuItem, TableHead, TextField, IconButton } from "@mui/material";
import { Search } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { StyledTableCell, StyledTableRow } from "../../users/(table)/styles-table";

type FilterKeys = "id" | "name" | "phone" | "isBlocked" | "isOnlyAdmin";

export default function ClientTableHeader({
  filters,
  setFilters,
}: {
  filters: Partial<Record<FilterKeys, string>>;
  setFilters: (filters: Partial<Record<FilterKeys, string>>) => void;
}) {
  // Não precisa manter localFilters, pode usar direto os filtros do pai

  const onChangeFilter = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters };
    if (value === "" || value === "none") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
  };

  return (
    <TableHead>
      <StyledTableRow className="sticky top-0 z-10 rounded-md text-gray-600 bg-white dark:bg-indigo-900">
        <StyledTableCell sx={{ width: "100px" }}>
          <TextField
            label="ID"
            variant="standard"
            InputProps={{ disableUnderline: true }}
            onChange={(e) => onChangeFilter("id", e.target.value)}
            value={filters?.id || ""}
            type="number"
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Nome"
            variant="standard"
            InputProps={{ disableUnderline: true }}
            onChange={(e) => onChangeFilter("name", e.target.value)}
            value={filters?.name || ""}
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Telefone"
            variant="standard"
            InputProps={{ disableUnderline: true }}
            onChange={(e) => onChangeFilter("phone", e.target.value)}
            value={filters?.phone || ""}
          />
        </StyledTableCell>

        <StyledTableCell>
          <TextField
            label="Bloqueado"
            variant="standard"
            select
            style={{ width: "6rem" }}
            InputProps={{ disableUnderline: true }}
            onChange={(e) => onChangeFilter("isBlocked", e.target.value)}
            value={filters?.isBlocked ?? "none"}
          >
            <MenuItem value="none">Ambos</MenuItem>
            <MenuItem value="true">Sim</MenuItem>
            <MenuItem value="false">Não</MenuItem>
          </TextField>
        </StyledTableCell>
        <StyledTableCell sx={{ width: "100px" }}>
          <TextField
            label="Admin"
            variant="standard"
            select
            style={{ width: "6rem" }}
            InputProps={{ disableUnderline: true }}
            onChange={(e) => onChangeFilter("isOnlyAdmin", e.target.value)}
            value={filters?.isOnlyAdmin ?? "none"}
          >
            <MenuItem value="none">Ambos</MenuItem>
            <MenuItem value="true">Sim</MenuItem>
            <MenuItem value="false">Não</MenuItem>
          </TextField>
        </StyledTableCell>
        <StyledTableCell sx={{ width: "150px" }}>
        </StyledTableCell>
      </StyledTableRow>
    </TableHead>
  );
}
