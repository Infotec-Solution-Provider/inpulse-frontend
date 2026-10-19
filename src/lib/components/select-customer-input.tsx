import { useCustomersContext } from "@/app/(private)/[instance]/(cruds)/customers/customers-context";
import { Customer } from "@/lib/sdk-local";
import { Autocomplete, CircularProgress, MenuItem, TextField } from "@mui/material";
import { useEffect, useState } from "react";

interface Props {
  defaultValue?: Customer | null;
  onChange?: (customer: Customer | null) => void;
  initialFilterBy?: "RAZAO" | "COD_ERP" | "CODIGO" | "CPF_CNPJ";
  showDetails?: boolean;
  disabled?: boolean;
}

export default function SelectCustomerInput({ defaultValue, onChange, initialFilterBy = "RAZAO", showDetails = false, disabled = false }: Props) {
  const { searchCustomers } = useCustomersContext();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(defaultValue || null);
  const [inputValue, setInputValue] = useState(
    defaultValue?.RAZAO || defaultValue?.FANTASIA || "",
  );
  const [filterBy, setFilterBy] = useState<"RAZAO" | "COD_ERP" | "CODIGO"|"CPF_CNPJ">(initialFilterBy);
  const [options, setOptions] = useState<Customer[]>(defaultValue ? [defaultValue] : []);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      setLoading(true);
      setSearchFailed(false);
      try {
        const results = await searchCustomers(inputValue, filterBy);
        if (active) setOptions(Array.from(new Map(results.map((customer) => [customer.CODIGO, customer])).values()));
      } catch {
        if (active) { setOptions([]); setSearchFailed(true); }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [inputValue, filterBy, searchCustomers]);

  useEffect(() => {
    if (!defaultValue) return;
    setSelectedCustomer(defaultValue);
    setOptions((prev) => {
      const exists = prev.some((customer) => customer.CODIGO === defaultValue.CODIGO);
      return exists ? prev : [defaultValue, ...prev];
    });
  }, [defaultValue]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <TextField
          select
          size="small"
          label="Filtrar por"
          disabled={disabled}
          value={filterBy}
          onChange={(e) => {
            setFilterBy(e.target.value as typeof filterBy);
            setSelectedCustomer(null);
            onChange?.(null);
          }}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="RAZAO">Razão</MenuItem>
          <MenuItem value="COD_ERP">Cód. ERP</MenuItem>
          <MenuItem value="CODIGO">Código</MenuItem>
          <MenuItem value="CPF_CNPJ">CPF/CNPJ</MenuItem>

        </TextField>
        <div className="min-w-0 flex-1">
          <Autocomplete
            disabled={disabled}
            value={selectedCustomer}
            options={options}
            loading={loading}
            filterOptions={(x) => x}
            getOptionLabel={(option) => option.RAZAO || option.FANTASIA || ""}
            isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO} // Necessário p/ evitar warnings do MUI
            onInputChange={(_, value, reason) => {
              setInputValue(value);
              if (reason === "input" && selectedCustomer) {
                setSelectedCustomer(null);
                onChange?.(null);
              }
            }}
            onChange={(_, value) => {
              setSelectedCustomer(value);
              setInputValue(value?.RAZAO || value?.FANTASIA || "");
              onChange && onChange(value); // Chama callback do pai
            }}
            loadingText="Buscando clientes..."
            noOptionsText={searchFailed ? "Busca indisponível. Tente novamente." : inputValue ? "Nenhum cliente encontrado" : "Digite para buscar"}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li key={option.CODIGO} {...rest}>
                  <div>
                    <div>{option.RAZAO || option.FANTASIA || ""}</div>
                    {showDetails && (
                      <small>Código {option.CODIGO} · {option.CPF_CNPJ || "CPF/CNPJ não informado"}{option.COD_ERP ? ` · ERP ${option.COD_ERP}` : ""}</small>
                    )}
                  </div>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cliente"
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
