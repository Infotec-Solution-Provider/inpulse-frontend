import { MenuItem, TableHead, TextField } from "@mui/material";
import { PaginatedResponse, RequestFilters, User } from "@in.pulse-crm/sdk";
import { Dispatch, SetStateAction } from "react";
import { Search } from "@mui/icons-material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import usersService from "@/lib/services/users.service";

interface UsersTableHeaderProps {
  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setTotalPages: (totalPages: number) => void;
  setUsers: (users: Partial<User>[]) => void;
  rowsPerPage: string;
  filters?: RequestFilters<User>;
  setFilters: Dispatch<SetStateAction<RequestFilters<User> | undefined>>;
}

export default function UsersTableHeader({
  setLoading,
  setPage,
  setTotalPages,
  setUsers,
  rowsPerPage,
  filters,
  setFilters,
}: UsersTableHeaderProps) {
  function setSearchFiltersHandler() {
    console.log(filters);
    setLoading(true);
    usersService
      .getUsers({ ...filters, perPage: rowsPerPage, page: "1" })
      .then((response: PaginatedResponse<User>) => {
        setUsers(response.data);
        setPage(response.page.current);
        setTotalPages(response.page.total);
        setLoading(false);
      });
  }

  return (
    <TableHead>
      <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900">
        <StyledTableCell>
          <TextField
            label="Código"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            value={filters?.CODIGO || ""}
            onChange={(e) => {
              const value = e.target.value;
              if (!isNaN(Number(value))) {
                setFilters((prev) => {
                  const updated = { ...prev };
                  if (value) {
                    updated.CODIGO = value;
                  } else {
                    delete updated.CODIGO;
                  }
                  return updated;
                });
              }
            }}
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            name="ATIVO"
            label="Ativo"
            variant="standard"
            style={{ width: "6rem" }}
            select
            slotProps={{ input: { disableUnderline: true } }}
            value={filters?.ATIVO || ""}
            onChange={(e) => {
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.ATIVO = e.target.value;
                } else {
                  delete updatedFilters.ATIVO;
                }
                return updatedFilters;
              });
            }}
          >
            <MenuItem value="" key="none">
              Ambos
            </MenuItem>
            <MenuItem value="SIM" key="SIM">
              Sim
            </MenuItem>
            <MenuItem value="NAO" key="NAO">
              Não
            </MenuItem>
          </TextField>
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Nome"
            variant="standard"
            value={filters?.NOME || ""}
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.NOME = e.target.value;
                } else {
                  delete updatedFilters.NOME;
                }
                return updatedFilters;
              })
            }
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="E-Mail"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            value={filters?.EMAIL || ""}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.EMAIL = e.target.value;
                } else {
                  delete updatedFilters.EMAIL;
                }
                return updatedFilters;
              })
            }
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Setor"
            variant="standard"
            value={filters?.SETOR || ""}
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.SETOR = e.target.value;
                } else {
                  delete updatedFilters.SETOR;
                }
                return updatedFilters;
              })
            }
          />
        </StyledTableCell>
        <StyledTableCell>
          <button onClick={setSearchFiltersHandler}>
            <Search />
          </button>
        </StyledTableCell>
      </StyledTableRow>
    </TableHead>
  );
}
