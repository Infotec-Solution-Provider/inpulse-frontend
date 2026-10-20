"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { Filter, RefreshCw, Search } from "lucide-react";
import { CrmDialog } from "./crm-dialog";
import { CrmToolbar } from "./crm-components";
import { OperationalIconButton } from "./actions";

export type CrmFilterValues = Record<string, string>;
export type CrmFilterField = {
  key: string;
  label: string;
  multiple?: boolean;
  options?: { value: string; label: string }[];
};

/** Drafts live only in the open panel. Applying replaces the query atomically. */
export function CrmFilters({
  fields,
  values,
  onApply,
  onRefresh,
  loading = false,
}: {
  fields: CrmFilterField[];
  values: CrmFilterValues;
  onApply: (values: CrmFilterValues) => void;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const simple = fields.find((field) => !field.options);
  const [search, setSearch] = useState(simple ? (values[simple.key] ?? "") : "");
  const appliedSearch = simple ? (values[simple.key] ?? "") : "";
  useEffect(() => setSearch(appliedSearch), [appliedSearch]);
  const active = fields.filter((field) => Boolean(values[field.key]));
  function apply(next: CrmFilterValues, syncSearch = true) {
    onApply(next);
    setSearch(simple ? (next[simple.key] ?? "") : "");
    setOpen(false);
  }
  return (
    <>
      <CrmToolbar>
        {simple && (
          <form
            className="ip-crud-search"
            onSubmit={(event) => {
              event.preventDefault();
              apply({ ...values, [simple.key]: search.trim() });
            }}
          >
            <TextField
              size="small"
              label={`Buscar por ${simple.label.toLocaleLowerCase("pt-BR")}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <OperationalIconButton label="Buscar" type="submit">
              <Search size={18} />
            </OperationalIconButton>
          </form>
        )}
        <Button
          variant="outlined"
          startIcon={<Filter size={16} />}
          onClick={() => {
            setDraft({ ...values });
            setOpen(true);
          }}
        >
          Filtros{active.length ? ` (${active.length})` : ""}
        </Button>
        {onRefresh && (
          <OperationalIconButton label="Atualizar lista" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={18} />
          </OperationalIconButton>
        )}
      </CrmToolbar>
      {active.length > 0 && (
        <div className="ip-crud-applied-filters" aria-label="Filtros aplicados">
          {active.map((field) => (
            <Chip
              key={field.key}
              size="small"
              label={`${field.label}: ${
                field.multiple
                  ? values[field.key]
                      .split(",")
                      .map(
                        (value) =>
                          field.options?.find((option) => option.value === value)?.label ?? value,
                      )
                      .join(", ")
                  : (field.options?.find((option) => option.value === values[field.key])?.label ??
                    values[field.key])
              }`}
              onDelete={() => apply({ ...values, [field.key]: "" }, field.key === simple?.key)}
            />
          ))}
          <Button size="small" onClick={() => apply({})}>
            Limpar filtros
          </Button>
        </div>
      )}
      <CrmDialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtros</DialogTitle>
        <DialogContent>
          <div className="ip-crud-grid" style={{ paddingTop: 8 }}>
            {fields.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                size="small"
                fullWidth
                select={Boolean(field.options)}
                slotProps={field.multiple ? { select: { multiple: true } } : undefined}
                value={
                  field.multiple
                    ? (draft[field.key] ?? "").split(",").filter(Boolean)
                    : (draft[field.key] ?? "")
                }
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [field.key]: Array.isArray(event.target.value)
                      ? event.target.value.join(",")
                      : event.target.value,
                  }))
                }
              >
                {field.options && [
                  ...(field.multiple
                    ? []
                    : [
                        <MenuItem key="" value="">
                          Todos
                        </MenuItem>,
                      ]),
                  ...field.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  )),
                ]}
              </TextField>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => apply(draft)}>
            Aplicar
          </Button>
        </DialogActions>
      </CrmDialog>
    </>
  );
}
