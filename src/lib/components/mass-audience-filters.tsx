"use client";

import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { CrmDialog } from "@/lib/ui-system/crm-dialog";
import CustomerBasicFilters from "./customer-basic-filters";
import CustomerBusinessFiltersPanel from "./customer-business-filters";
import useCustomerBusinessFilterOptions from "@/lib/hooks/use-customer-business-filter-options";
import {
  createEmptyCustomerBusinessFilters,
  serializeCustomerBusinessFilters,
  type CustomerBusinessFilters,
} from "@/lib/types/customer-business-filters";
import { validateAudienceFilters, type AudienceFilters } from "@/lib/mass-audience";

function businessFrom(filters: Record<string, string>): CustomerBusinessFilters {
  const result = createEmptyCustomerBusinessFilters();
  for (const [key, initial] of Object.entries(result)) {
    const value = filters[key] ?? "";
    (result as unknown as Record<string, unknown>)[key] = Array.isArray(initial)
      ? key === "states"
        ? value.split(",").filter(Boolean)
        : value.split(",").filter(Boolean).map(Number)
      : value;
  }
  return result;
}

export default function MassAudienceFilters({
  filters,
  sectors,
  onApply,
  onClose,
}: {
  filters: AudienceFilters;
  sectors: Array<{ id: number; name: string }>;
  onApply: (value: AudienceFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AudienceFilters>(() => structuredClone(filters));
  const [error, setError] = useState<string | null>(null);
  const { options, loading } = useCustomerBusinessFilterOptions();
  const contact = draft.contactFilters;
  const updateContact = (next: typeof contact) =>
    setDraft((old) => ({ ...old, contactFilters: next }));
  const apply = () => {
    if (contact.phone?.trim() && !contact.phone.replace(/\D/g, "")) {
      setError("Informe um telefone de contato com dígitos.");
      return;
    }
    const cleaned: AudienceFilters = {
      contactFilters: {
        ...(contact.id !== undefined ? { id: contact.id } : {}),
        ...(contact.ids?.length ? { ids: contact.ids } : {}),
        ...(contact.name?.trim() ? { name: contact.name.trim() } : {}),
        ...(contact.phone?.replace(/\D/g, "") ? { phone: contact.phone.replace(/\D/g, "") } : {}),
        ...(contact.hasCustomer !== undefined ? { hasCustomer: contact.hasCustomer } : {}),
        ...(contact.sectorIds?.length ? { sectorIds: contact.sectorIds } : {}),
      },
      customerFilters: Object.fromEntries(
        Object.entries(draft.customerFilters)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value),
      ),
    };
    const invalid = validateAudienceFilters(cleaned);
    setError(invalid);
    if (!invalid) onApply(cleaned);
  };
  return (
    <CrmDialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="mass-audience-filter-title"
    >
      <DialogTitle id="mass-audience-filter-title">Filtros do público</DialogTitle>
      <DialogContent dividers>
        <p className="ip-muted mb-4">
          Os filtros de contatos e clientes são combinados. Novos critérios desativam a seleção de
          todos os resultados; a seleção manual é preservada.
        </p>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {contact.hasCustomer === false && Object.values(draft.customerFilters).some(Boolean) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Sem cliente combinado com filtros de clientes não retorna contatos.
          </Alert>
        )}
        <h3 className="ip-crud-section-title">Contatos</h3>
        <div className="ip-crud-grid">
          <TextField
            size="small"
            label="Nome do contato"
            value={contact.name ?? ""}
            onChange={(event) => updateContact({ ...contact, name: event.target.value })}
          />
          <TextField
            size="small"
            label="Código do contato"
            type="number"
            value={contact.id ?? ""}
            onChange={(event) =>
              updateContact({
                ...contact,
                id: event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
            inputProps={{ min: 1, step: 1 }}
          />
          <TextField
            size="small"
            label="Telefone do contato"
            value={contact.phone ?? ""}
            onChange={(event) => updateContact({ ...contact, phone: event.target.value })}
          />
          <TextField
            size="small"
            select
            label="Vínculo com cliente"
            value={contact.hasCustomer === undefined ? "" : String(contact.hasCustomer)}
            onChange={(event) =>
              updateContact({
                ...contact,
                hasCustomer: event.target.value === "" ? undefined : event.target.value === "true",
              })
            }
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="true">Com cliente</MenuItem>
            <MenuItem value="false">Sem cliente</MenuItem>
          </TextField>
          <Autocomplete
            multiple
            options={sectors}
            value={sectors.filter((sector) => contact.sectorIds?.includes(sector.id))}
            getOptionLabel={(sector) => sector.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, values) =>
              updateContact({ ...contact, sectorIds: values.map((value) => value.id) })
            }
            renderInput={(params) => <TextField {...params} size="small" label="Setores" />}
          />
        </div>
        <h3 className="ip-crud-section-title" style={{ marginTop: 24 }}>
          Clientes
        </h3>
        <CustomerBasicFilters
          filters={draft.customerFilters}
          onChange={(next) =>
            setDraft((old) => ({ ...old, customerFilters: next as Record<string, string> }))
          }
        />
        <h3 className="ip-crud-section-title" style={{ marginTop: 24 }}>
          Dados comerciais
        </h3>
        {loading && <p className="ip-muted">Carregando opções…</p>}
        <CustomerBusinessFiltersPanel
          phoneLabel="Telefone cadastrado no cliente"
          filters={businessFrom(draft.customerFilters)}
          options={options}
          onChange={(next) =>
            setDraft((old) => {
              const customerFilters = { ...old.customerFilters };
              for (const key of Object.keys(createEmptyCustomerBusinessFilters()))
                delete customerFilters[key];
              return {
                ...old,
                customerFilters: { ...customerFilters, ...serializeCustomerBusinessFilters(next) },
              };
            })
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={apply}>
          Aplicar filtros
        </Button>
      </DialogActions>
    </CrmDialog>
  );
}
