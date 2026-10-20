import type {
  CustomerBusinessFilterOptions,
  CustomerBusinessFilters,
  CustomerPurchaseStatus,
} from "@/lib/types/customer-business-filters";
import type { CustomerLookupOption } from "@/lib/sdk-local";
import { Autocomplete, MenuItem, TextField } from "@mui/material";
import CustomerSearchLookup from "./customer-search-lookup";

interface CustomerBusinessFiltersProps {
  filters: CustomerBusinessFilters;
  options: CustomerBusinessFilterOptions;
  onChange: (filters: CustomerBusinessFilters) => void;
  phoneLabel?: string;
}

function getSelectedOptions(options: CustomerLookupOption[], ids: number[]) {
  const selectedIds = new Set(ids);
  return options.filter((option) => selectedIds.has(option.CODIGO));
}

export default function CustomerBusinessFiltersPanel({
  filters,
  options,
  onChange,
  phoneLabel = "Telefone contém",
}: CustomerBusinessFiltersProps) {
  const update = <K extends keyof CustomerBusinessFilters>(
    key: K,
    value: CustomerBusinessFilters[K],
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const renderLookup = (
    label: string,
    lookupOptions: CustomerLookupOption[],
    key: "campaignIds" | "segmentIds" | "loyaltyOperatorIds",
  ) => (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={lookupOptions}
      value={getSelectedOptions(lookupOptions, filters[key])}
      isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
      getOptionLabel={(option) => option.NOME?.trim() || `#${option.CODIGO}`}
      onChange={(_, selected) =>
        update(
          key,
          selected.map((option) => option.CODIGO),
        )
      }
      renderInput={(params) => <TextField {...params} size="small" label={label} />}
    />
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        select
        size="small"
        label="Compras"
        value={filters.purchaseStatus}
        onChange={(event) => {
          const purchaseStatus = event.target.value as CustomerPurchaseStatus;
          onChange({
            ...filters,
            purchaseStatus,
            ...(purchaseStatus === "without_purchases" ? { purchaseFrom: "", purchaseTo: "" } : {}),
          });
        }}
      >
        <MenuItem value="">Todas</MenuItem>
        <MenuItem value="with_purchases">Com compras</MenuItem>
        <MenuItem value="without_purchases">Sem compras</MenuItem>
      </TextField>

      <div className="grid grid-cols-2 gap-2">
        <TextField
          size="small"
          type="date"
          label="Compra de"
          value={filters.purchaseFrom}
          disabled={filters.purchaseStatus === "without_purchases"}
          onChange={(event) => update("purchaseFrom", event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="Compra até"
          value={filters.purchaseTo}
          disabled={filters.purchaseStatus === "without_purchases"}
          onChange={(event) => update("purchaseTo", event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </div>

      {renderLookup("Campanhas", options.campaigns, "campaignIds")}
      {renderLookup("Segmentos", options.segments, "segmentIds")}

      <div className="grid grid-cols-2 gap-2">
        <TextField
          size="small"
          type="date"
          label="Cadastro de"
          value={filters.registeredFrom}
          onChange={(event) => update("registeredFrom", event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="Cadastro até"
          value={filters.registeredTo}
          onChange={(event) => update("registeredTo", event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </div>

      <div className="sm:col-span-2">
        {renderLookup("Usuários fidelizados", options.operators, "loyaltyOperatorIds")}
      </div>
      {(
        [
          ["Grupos de clientes", "groups", "groupIds"],
          ["Origens", "origins", "originIds"],
          ["Mídias CRM", "medias", "mediaIds"],
          ["Marcas", "brands", "brandIds"],
          ["Unidades", "units", "unitIds"],
          ["Cargos dos contatos", "positions", "positionIds"],
        ] as const
      ).map(([label, kind, key]) => (
        <CustomerSearchLookup
          key={key}
          label={label}
          kind={kind}
          value={filters[key]}
          onChange={(ids) => update(key, ids.map(Number))}
        />
      ))}
      <CustomerSearchLookup
        label="Estados"
        kind="states"
        value={filters.states}
        onChange={(ids) => update("states", ids)}
      />
      <TextField
        size="small"
        label={phoneLabel}
        value={filters.phone}
        onChange={(event) => update("phone", event.target.value)}
        helperText="Pelo menos três dígitos"
      />
      <TextField
        size="small"
        label="E-mail contém"
        value={filters.email}
        onChange={(event) => update("email", event.target.value)}
      />
    </div>
  );
}
