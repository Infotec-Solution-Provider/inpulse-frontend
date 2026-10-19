import { describe, it, expect } from "vitest";
import reducer, { type CustomersContextState } from "./customers-reducer";
const state = (): CustomersContextState => ({ scope: "tenant-a:1", customers: [], filters: { page: "3", perPage: "20", RAZAO: "Consulta" }, totalRows: 0, isLoading: false });
describe("customer applied query controls", () => {
  it("applies the whole draft once and returns to the first page", () => {
    const original = state(), next = reducer(original, { type: "apply-filters", filters: { ...original.filters, CIDADE: "Canoas", ATIVO: "SIM" } });
    expect(next.filters).toEqual({ page: "1", perPage: "20", RAZAO: "Consulta", CIDADE: "Canoas", ATIVO: "SIM" });
    expect(original.filters.page).toBe("3");
  });
  it("pagination and chip removal do not mutate an applied snapshot", () => {
    const original = state();
    const removed = reducer(original, { type: "remove-filter", key: "RAZAO" });
    expect(removed.filters.RAZAO).toBeUndefined(); expect(original.filters.RAZAO).toBe("Consulta");
    expect(reducer(original, { type: "change-page", page: 4 }).filters.page).toBe("5"); expect(original.filters.page).toBe("3");
  });
  it("a new actor or tenant receives empty results and no previous search", () => {
    expect(reducer(state(), { type: "reset-context", scope: "tenant-b:2" })).toEqual({ scope: "tenant-b:2", customers: [], filters: { page: "1", perPage: "10" }, totalRows: 0, isLoading: false });
  });
});
