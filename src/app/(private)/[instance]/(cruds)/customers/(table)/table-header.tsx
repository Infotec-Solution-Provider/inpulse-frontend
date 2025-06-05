import { MenuItem, TableHead, TextField } from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { Search } from "@mui/icons-material";
import { Customer } from "@in.pulse-crm/sdk";
import { useRef } from "react";
import { useCustomersContext } from "../customers-context";

export default function ClientTableHeader() {
  const { dispatch, loadCustomers, state } = useCustomersContext();
  const filtersRef = useRef(state.filters);

  const onChangeFilter = (key: keyof Customer, value: string) => {
    if (value === "" || value === "none") {
      delete filtersRef.current[key]; // Remove a chave se o valor for vazio
    } else {
      filtersRef.current[key] = value; // Atualiza o valor do filtro
    }
  };

  const onClickSearch = () => {
    dispatch({ type: "change-filters", filters: filtersRef.current });
    loadCustomers();
  };

  return (
    <TableHead>
<StyledTableRow className="sticky top-0 z-10 rounded-md text-gray-600 bg-white dark:bg-indigo-900">
        <StyledTableCell>
          <TextField
            label="Código"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) => onChangeFilter("CODIGO", e.target.value)}
            defaultValue={state.filters?.CODIGO || ""}
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
            onChange={(e) => onChangeFilter("ATIVO", e.target.value)}
            defaultValue={state.filters?.ATIVO || ""}
          >
            <MenuItem value="none" key="none">
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
            name="PESSOA"
            label="Pessoa"
            variant="standard"
            style={{ width: "7rem" }}
            select
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) => onChangeFilter("PESSOA", e.target.value)}
            defaultValue={state.filters?.PESSOA || ""}
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
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) => onChangeFilter("RAZAO", e.target.value)}
            defaultValue={state.filters?.RAZAO || ""}
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="CPF/CNPJ"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) => onChangeFilter("CPF_CNPJ", e.target.value)}
            defaultValue={state.filters?.CPF_CNPJ || ""}
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Cidade"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) => onChangeFilter("CIDADE", e.target.value)}
            defaultValue={state.filters?.CIDADE || ""}
          />
        </StyledTableCell>
        <StyledTableCell>
          <TextField
            label="Código ERP"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            onChange={(e) => onChangeFilter("COD_ERP", e.target.value)}
            defaultValue={state.filters?.COD_ERP || ""}
          />
        </StyledTableCell>
        <StyledTableCell>
          <button onClick={onClickSearch}>
            <Search />
          </button>
        </StyledTableCell>
      </StyledTableRow>
    </TableHead>
  );
}
