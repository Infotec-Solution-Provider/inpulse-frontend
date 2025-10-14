import { useCustomersContext } from "@/app/(private)/[instance]/(cruds)/customers/customers-context";
import { Customer } from "@in.pulse-crm/sdk";
import { Autocomplete, createFilterOptions, TextField } from "@mui/material";
import { useState } from "react";

interface Props {
  defaultValue?: Customer | null;
  onChange?: (customer: Customer | null) => void;
}

export default function SelectCustomerInput({ defaultValue, onChange }: Props) {
  const { allCustomers } = useCustomersContext();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(defaultValue || null);

  const filterOptions = createFilterOptions<Customer>({
    stringify: (option) => option.RAZAO.toLowerCase(), // converte pra minúsculo
    limit: 20,
  });

  return (
    <Autocomplete
      value={selectedCustomer}
      options={allCustomers}
      getOptionLabel={(option) => option.RAZAO || option.FANTASIA || ""}
      isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO} // Necessário p/ evitar warnings do MUI
      filterOptions={filterOptions}
      onChange={(_, value) => {
        setSelectedCustomer(value);
        onChange && onChange(value); // Chama callback do pai
      }}
      renderInput={(params) => <TextField {...params} label="Cliente" variant="outlined" />}
    />
  );
}
