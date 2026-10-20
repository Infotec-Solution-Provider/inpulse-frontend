"use client";
import { CrmFilters, type CrmFilterValues } from "@/lib/ui-system";
import { useContactsContext } from "../contacts-context";
import { useWhatsappContext } from "../../../whatsapp-context";
import type { ChangeContactsStateAction } from "./contacts-reducer";

export default function ContactsFilters() {
  const { state, dispatch, loadContacts } = useContactsContext();
  const { sectors = [] } = useWhatsappContext();
  const keys = ["name", "id", "phone", "customerName", "hasCustomer"] as const;
  const values: CrmFilterValues = Object.fromEntries(
    keys.map((key) => [key, state.filters[key] ?? ""]),
  );
  // A list preserves multi-sector filters from operational entry points.
  values.sectorIds = (state.filters.sectorIds ?? []).join(",");
  return (
    <CrmFilters
      values={values}
      loading={state.isLoading}
      onRefresh={loadContacts}
      fields={[
        { key: "name", label: "Nome" },
        { key: "id", label: "Código" },
        { key: "phone", label: "Telefone" },
        { key: "customerName", label: "Cliente" },
        {
          key: "hasCustomer",
          label: "Vínculo com cliente",
          options: [
            { value: "false", label: "Sem cliente" },
            { value: "true", label: "Com cliente" },
          ],
        },
        {
          key: "sectorIds",
          label: "Setores",
          multiple: true,
          options: sectors.map((sector) => ({ value: String(sector.id), label: sector.name })),
        },
      ]}
      onApply={(next) => {
        const actions: ChangeContactsStateAction[] = keys.map((key) =>
          next[key]
            ? { type: "change-filter", key, value: next[key] }
            : { type: "remove-filter", key },
        );
        actions.push({
          type: "set-sector-filter",
          sectorIds: (next.sectorIds ?? "").split(",").filter(Boolean).map(Number),
        });
        dispatch({ type: "multiple", actions });
      }}
    />
  );
}
