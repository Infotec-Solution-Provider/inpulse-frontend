import { useCustomersContext } from "@/app/(private)/[instance]/(cruds)/customers/customers-context";
import { Customer } from "@in.pulse-crm/sdk";
import { Autocomplete, CircularProgress, TextField } from "@mui/material";
import { useEffect, useState } from "react";

interface Props {
  defaultValue?: Customer | null;
  onChange?: (customer: Customer | null) => void;
}

export default function SelectCustomerInput({ defaultValue, onChange }: Props) {
  const { searchCustomers } = useCustomersContext();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(defaultValue || null);
  const [inputValue, setInputValue] = useState(
    defaultValue?.RAZAO || defaultValue?.FANTASIA || "",
  );
  const [options, setOptions] = useState<Customer[]>(defaultValue ? [defaultValue] : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      setLoading(true);
      const results = await searchCustomers(inputValue);

      if (active) {
        // Dedupe by CODIGO to avoid duplicate option keys
        const deduped = Array.from(
          new Map(results.map((customer) => [customer.CODIGO, customer])).values(),
        );

        setOptions((prev) => {
          const merged = [...prev, ...deduped];
          return Array.from(new Map(merged.map((c) => [c.CODIGO, c])).values());
        });
      }
      setLoading(false);
    }, 300);

    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [inputValue, searchCustomers]);

  useEffect(() => {
    if (!defaultValue) return;
    setSelectedCustomer(defaultValue);
    setOptions((prev) => {
      const exists = prev.some((customer) => customer.CODIGO === defaultValue.CODIGO);
      return exists ? prev : [defaultValue, ...prev];
    });
  }, [defaultValue]);

  return (
    <Autocomplete
      value={selectedCustomer}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(option) => option.RAZAO || option.FANTASIA || ""}
      isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO} // Necessário p/ evitar warnings do MUI
      onInputChange={(_, value) => setInputValue(value)}
      onChange={(_, value) => {
        setSelectedCustomer(value);
        setInputValue(value?.RAZAO || value?.FANTASIA || "");
        onChange && onChange(value); // Chama callback do pai
      }}
      loadingText="Buscando clientes..."
      noOptionsText={inputValue ? "Nenhum cliente encontrado" : "Digite para buscar"}
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
  );
}
