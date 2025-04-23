import { MenuItem, TableHead, TextField } from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { Customer, PaginatedResponse, RequestFilters } from "@in.pulse-crm/sdk";
import customersService from "@/lib/services/customers.service";
import { Dispatch, SetStateAction } from "react";
import { Search } from "@mui/icons-material";

interface ClientTableHeaderProps {
  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setTotalPages: (totalPages: number) => void;
  setClients: (clients: Partial<Customer>[]) => void;
  rowsPerPage: string;
  filters?: RequestFilters<Customer>;
  setFilters: Dispatch<SetStateAction<RequestFilters<Customer> | undefined>>;
}

export default function ClientTableHeader({
  setLoading,
  setPage,
  setTotalPages,
  setClients,
  rowsPerPage,
  filters,
  setFilters,
}: ClientTableHeaderProps) {
  function setSearchFiltersHandler() {
    setLoading(true);
    customersService
      .getCustomers({ ...filters, perPage: rowsPerPage, page: "1" })
      .then((response: PaginatedResponse<Customer>) => {
        setClients(response.data);
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
            name="PESSOAA"
            label="Pessoa"
            variant="standard"
            style={{ width: "7rem" }}
            select
            slotProps={{ input: { disableUnderline: true } }}
            value={filters?.PESSOA || ""}
            onChange={(e) => {
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.PESSOA = e.target.value;
                } else {
                  delete updatedFilters.PESSOA;
                }
                return updatedFilters;
              });
            }}
          >
            <MenuItem value="" key="none">
              Ambos
            </MenuItem>
            <MenuItem value="JUR" key="JUR">
              JUR
            </MenuItem>
            <MenuItem value="FIS" key="FIS">
              FIS
            </MenuItem>
          </TextField>
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Razão social"
            variant="standard"
            value={filters?.RAZAO || ""}
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.RAZAO = e.target.value;
                } else {
                  delete updatedFilters.RAZAO;
                }
                return updatedFilters;
              })
            }
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="CPF/CNPJ"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            value={filters?.CPF_CNPJ || ""}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.CPF_CNPJ = e.target.value;
                } else {
                  delete updatedFilters.CPF_CNPJ;
                }
                return updatedFilters;
              })
            }
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Cidade"
            variant="standard"
            value={filters?.CIDADE || ""}
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.CIDADE = e.target.value;
                } else {
                  delete updatedFilters.CIDADE;
                }
                return updatedFilters;
              })
            }
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Código ERP"
            variant="standard"
            value={filters?.COD_ERP || ""}
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) =>
              setFilters((prevFilters) => {
                const updatedFilters = { ...prevFilters };
                if (e.target.value) {
                  updatedFilters.COD_ERP = e.target.value;
                } else {
                  delete updatedFilters.COD_ERP;
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
