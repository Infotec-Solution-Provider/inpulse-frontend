import { describe, expect, it } from "vitest";
import { appliedFilterLabels } from "./applied-filter-labels";
import { createInitialFilters } from "./filters-state";

describe("applied monitor filter labels", () => {
  it("does not advertise default conditions as active filters", () => {
    expect(appliedFilterLabels(createInitialFilters(), String)).toEqual([]);
  });

  it("identifies search, operational status, responsible users and date ranges independently", () => {
    const filters = createInitialFilters();
    filters.searchText = "  Maria  ";
    filters.operationalStatus = "waiting_agent";
    filters.user = 17;
    filters.startedAt = { from: "2026-10-01", to: null };
    expect(appliedFilterLabels(filters, (id) => (id === 17 ? "Operadora" : String(id)))).toEqual([
      { key: "searchText", label: "Busca: Maria" },
      { key: "operationalStatus", label: "Filtro rápido: Aguardando atendente" },
      { key: "user", label: "Atendente: Operadora" },
      { key: "startedAt", label: "Início: 2026-10-01 a qualquer data" },
    ]);
    expect(filters.searchText).toBe("  Maria  ");
  });

  it("explains category exclusion including an explicitly empty selection", () => {
    const filters = createInitialFilters();
    filters.categories = {
      showCustomerChats: false,
      showInternalChats: false,
      showInternalGroups: false,
      showSchedules: false,
    };
    expect(appliedFilterLabels(filters, String)).toEqual([
      { key: "categories", label: "Categorias: nenhuma" },
    ]);
  });
});
