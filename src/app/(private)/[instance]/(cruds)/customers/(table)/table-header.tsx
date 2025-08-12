import { MenuItem, TableHead, TextField } from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { Search } from "@mui/icons-material";
import { Customer } from "@in.pulse-crm/sdk";
import { useRef } from "react";
import { useCustomersContext } from "../customers-context";

type FilterKeys = keyof Customer;
type RequestFilters<T> = {
  [K in keyof T]?: string | number | boolean | undefined;
};

export default function ClientTableHeader() {
  const { dispatch, loadCustomers, state } = useCustomersContext();
  const filtersRef = useRef<Record<string, any>>(state.filters || {});

  const onChangeFilter = (key: string, value: string) => {
    if (value === "" || value === "none") {
      const newFilters = { ...filtersRef.current };
      delete newFilters[key];
      filtersRef.current = newFilters;
    } else {
      filtersRef.current = { ...filtersRef.current, [key]: value };
    }
  };

  const onClickSearch = () => {
    dispatch({ type: "change-filters", filters: filtersRef.current });
    loadCustomers();
  };

  const textFieldSx = {
    '& .MuiInputBase-input': { 
      fontSize: '0.75rem',
      padding: '4px 8px',
      height: '1.5rem',
      width: '100%',
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.75rem',
      transform: 'translate(8px, 8px) scale(1)' as const,
    },
    '& .MuiInputLabel-shrink': {
      transform: 'translate(8px, -6px) scale(0.8)' as const,
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'rgba(0, 0, 0, 0.12)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(0, 0, 0, 0.23)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#3b82f6',
        borderWidth: '1px',
      },
    },
    width: '100%',
    minWidth: '100px',
    maxWidth: '140px',
  };

  const selectSx = {
    '& .MuiInputBase-input': { 
      fontSize: '0.75rem',
      padding: '4px 8px',
      height: '1.5rem',
      textTransform: 'capitalize',
      width: '100%',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'rgba(0, 0, 0, 0.12)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(0, 0, 0, 0.23)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#3b82f6',
        borderWidth: '1px',
      },
    },
    width: '100%',
    minWidth: '100px',
    maxWidth: '120px',
  };

  return (
    <TableHead>
      <StyledTableRow 
        className="text-gray-600"
        sx={{
          '& .MuiTableCell-root': {
            whiteSpace: 'nowrap',
            padding: '12px 10px',
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f1f5f9',
            '&:first-of-type': { 
              paddingLeft: '16px',
            },
            '&:last-child': { 
              paddingRight: '16px',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '50%',
              right: 0,
              height: '40%',
              transform: 'translateY(-50%)',
              width: '1px',
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            },
            '&:last-child::after': {
              display: 'none'
            }
          }
        }}
      >
        <StyledTableCell width={120} className="whitespace-nowrap">
          <TextField
            label="Código"
            variant="standard"
            size="small"
            fullWidth
            sx={textFieldSx}
            InputProps={{
              disableUnderline: true,
              className: 'h-8'
            }}
            onChange={(e) => onChangeFilter("CODIGO", e.target.value)}
            defaultValue={state.filters?.CODIGO || ""}
          />
        </StyledTableCell>
        <StyledTableCell width={120} className="whitespace-nowrap">
          <TextField
            label="Razão Social"
            variant="standard"
            size="small"
            fullWidth
            sx={textFieldSx}
            InputProps={{
              disableUnderline: true,
              className: 'h-8'
            }}
            onChange={(e) => onChangeFilter("PESSOA", e.target.value)}
            defaultValue={state.filters?.PESSOA || ""}
          />
        </StyledTableCell>
        <StyledTableCell className="w-48">
          <TextField
            label="Cidade"
            variant="standard"
            size="small"
            fullWidth
            sx={textFieldSx}
            value={state.filters?.CIDADE || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFilter("CIDADE", e.target.value)}
            InputProps={{
              disableUnderline: true,
              className: 'h-8'
            }}
          />
        </StyledTableCell>
        <StyledTableCell className="w-48">
          <TextField
            label="CPF/CNPJ"
            variant="standard"
            size="small"
            fullWidth
            sx={textFieldSx}
            value={state.filters?.CPF_CNPJ || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFilter("CPF_CNPJ", e.target.value)}
            InputProps={{
              disableUnderline: true,
              className: 'h-8'
            }}
          />
        </StyledTableCell>
        <StyledTableCell width={120} className="whitespace-nowrap">
          <TextField
            label="Cód. ERP"
            variant="standard"
            size="small"
            fullWidth
            sx={{
              ...textFieldSx,
              '& .MuiInputBase-input': {
                ...textFieldSx['& .MuiInputBase-input'],
                fontFamily: 'monospace'
              }
            }}
            InputProps={{
              disableUnderline: true,
              className: 'h-8'
            }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFilter("COD_ERP", e.target.value)}
            value={state.filters?.COD_ERP || ""}
          />
        </StyledTableCell>
        <StyledTableCell width={80} className="whitespace-nowrap">
          <div className="flex items-center justify-center w-full">
            <button 
              type="button"
              onClick={onClickSearch}
              className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
              title="Aplicar filtros"
            >
              <Search fontSize="small" />
            </button>
          </div>
        </StyledTableCell>
      </StyledTableRow>
    </TableHead>
  );
}
