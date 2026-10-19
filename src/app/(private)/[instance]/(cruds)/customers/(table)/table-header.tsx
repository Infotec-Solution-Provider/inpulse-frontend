"use client";
import { Button, MenuItem, TextField } from "@mui/material";
import { useState } from "react";
import {
  CrmToolbar,
  OperationalPanel,
  FilterChipBar,
  OperationalIconButton,
  UiIcon,
} from "@/lib/ui-system";
import CustomerBusinessFiltersPanel from "@/lib/components/customer-business-filters";
import useCustomerBusinessFilterOptions from "@/lib/hooks/use-customer-business-filter-options";
import {
  createEmptyCustomerBusinessFilters,
  serializeCustomerBusinessFilters,
} from "@/lib/types/customer-business-filters";
import type { CustomerBusinessFilters } from "@/lib/types/customer-business-filters";
import { useCustomersContext } from "../customers-context";
import type { CustomerListFilters } from "./customers-reducer";
const labels: Record<string, string> = {
  CODIGO: "Código",
  RAZAO: "Nome",
  CPF_CNPJ: "CPF/CNPJ",
  COD_ERP: "Código ERP",
  CIDADE: "Cidade",
  ATIVO: "Ativo",
  PESSOA: "Tipo de pessoa",
  purchaseStatus: "Compras",
  purchaseFrom: "Compra desde",
  purchaseTo: "Compra até",
  campaignIds: "Campanhas",
  segmentIds: "Segmentos",
  registeredFrom: "Cadastro desde",
  registeredTo: "Cadastro até",
  loyaltyOperatorIds: "Responsáveis",
  groupIds: "Grupos",
  originIds: "Origens",
  mediaIds: "Mídias",
  unitIds: "Unidades",
  brandIds: "Marcas",
  positionIds: "Cargos",
  states: "Estados",
  phone: "Telefone",
  email: "E-mail",
};
function businessFrom(filters: CustomerListFilters): CustomerBusinessFilters {
  const result = createEmptyCustomerBusinessFilters(),
    source = filters as Record<string, string>;
  for (const [key, initial] of Object.entries(result)) {
    if (Array.isArray(initial)) {
      const values = (source[key] ?? "").split(",").filter(Boolean);
      (result as unknown as Record<string, unknown>)[key] =
        key === "states"
          ? values
          : values.map(Number).filter((value) => Number.isInteger(value) && value > 0);
    } else (result as unknown as Record<string, unknown>)[key] = source[key] ?? initial;
  }
  return result;
}
export default function CustomerFilters() {
  const { state, dispatch, loadCustomers } = useCustomersContext();
  const { options, loading } = useCustomerBusinessFilterOptions();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(state.filters.RAZAO ?? ""),
    [draft, setDraft] = useState<CustomerListFilters>({ ...state.filters });
  const apply = (filters: CustomerListFilters) => {
    const clean = Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== "" && value !== undefined && value !== null,
      ),
    ) as CustomerListFilters;
    dispatch({ type: "apply-filters", filters: clean });
    setOpen(false);
  };
  const openFilters = () => {
    setDraft({ ...state.filters, RAZAO: name });
    setOpen(true);
  };
  const chips = Object.entries(state.filters)
    .filter(
      ([key, value]) => !["page", "perPage", "sortBy", "sortDirection"].includes(key) && value,
    )
    .map(([key, value]) => ({
      key,
      label: `${labels[key] ?? key}: ${value}`,
      onDelete: () => {
        const next = { ...state.filters } as Record<string, string>;
        delete next[key];
        apply(next as CustomerListFilters);
        if (key === "RAZAO") setName("");
      },
    }));
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({ ...state.filters, RAZAO: name });
        }}
      >
        <CrmToolbar>
          <TextField
            size="small"
            label="Buscar cliente por nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            sx={{ flex: "1 1 140px", minWidth: 0, maxWidth: 480 }}
          />
          <OperationalIconButton type="submit" label="Buscar clientes" tooltip="Buscar">
            <UiIcon name="search" scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton
            label="Filtros de clientes"
            tooltip="Filtros"
            onClick={openFilters}
          >
            <UiIcon name="filter" scale="toolbar" />
          </OperationalIconButton>
          <OperationalIconButton
            label="Atualizar clientes"
            tooltip="Atualizar"
            disabled={state.isLoading}
            onClick={loadCustomers}
          >
            <UiIcon name="refresh" scale="toolbar" />
          </OperationalIconButton>
        </CrmToolbar>
      </form>
      <FilterChipBar
        items={chips}
        onShowAll={openFilters}
        onClearAll={() => {
          setName("");
          apply({ page: "1", perPage: state.filters.perPage });
        }}
      />
      <OperationalPanel
        open={open}
        title="Filtros de clientes"
        width={720}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={() => {
                setName(draft.RAZAO ?? "");
                apply(draft);
              }}
            >
              Aplicar filtros
            </Button>
          </>
        }
      >
        <div className="ip-crud-grid">
          {(["CODIGO", "CPF_CNPJ", "COD_ERP", "CIDADE"] as const).map((key) => (
            <TextField
              key={key}
              label={labels[key]}
              value={draft[key] ?? ""}
              onChange={(event) =>
                setDraft((old) => ({
                  ...old,
                  [key]:
                    key === "CPF_CNPJ" ? event.target.value.replace(/\D/g, "") : event.target.value,
                }))
              }
            />
          ))}
          <TextField
            select
            label="Situação"
            value={draft.ATIVO ?? ""}
            onChange={(event) => setDraft((old) => ({ ...old, ATIVO: event.target.value }))}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="SIM">Ativos</MenuItem>
            <MenuItem value="NAO">Inativos</MenuItem>
          </TextField>
          <TextField
            select
            label="Tipo de pessoa"
            value={draft.PESSOA ?? ""}
            onChange={(event) => setDraft((old) => ({ ...old, PESSOA: event.target.value }))}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="FIS">Física</MenuItem>
            <MenuItem value="JUR">Jurídica</MenuItem>
          </TextField>
        </div>
        <h3 className="ip-crud-section-title" style={{ marginTop: 24 }}>
          Dados comerciais
        </h3>
        {loading && <p className="ip-muted">Carregando opções…</p>}
        <CustomerBusinessFiltersPanel
          filters={businessFrom(draft)}
          options={options}
          onChange={(next) =>
            setDraft((old) => {
              const result = { ...old } as Record<string, string>;
              for (const key of Object.keys(createEmptyCustomerBusinessFilters()))
                delete result[key];
              return {
                ...result,
                ...serializeCustomerBusinessFilters(next),
              } as CustomerListFilters;
            })
          }
        />
      </OperationalPanel>
    </>
  );
}
