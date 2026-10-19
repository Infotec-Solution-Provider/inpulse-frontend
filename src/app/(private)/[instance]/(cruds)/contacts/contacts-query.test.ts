import { describe, it, expect } from "vitest";
import { buildContactsQuery, contactPageAfterLoad } from "./contacts-query";
import contactsReducer, { type ContactsContextState } from "./(table)/contacts-reducer";

describe("contact quality filters", () => {
  it("preserves unlinked, tenant-sector and pagination filters while searching", () => {
    expect(buildContactsQuery({ page: "2", perPage: "10", hasCustomer: "false", sectorIds: [16, 17], searchField: "cpf-cnpj", searchTerm: "12.345.678/0001-90" }))
      .toEqual({ page: 2, perPage: 10, hasCustomer: false, sectorIds: "16,17", customerCnpj: "12345678000190" });
  });
  it("resets page when selecting unlinked without clearing the remaining filters", () => {
    const state: ContactsContextState = { contacts: [], totalRows: 25, isLoading: false, filters: { page: "3", perPage: "10", sectorIds: [16], searchField: "nome", searchTerm: "Fixture" } };
    const changed = contactsReducer(state, { type: "change-filter", key: "hasCustomer", value: "false" });
    expect(changed.filters).toEqual({ ...state.filters, page: "1", hasCustomer: "false" });
    expect(contactPageAfterLoad(3, 10, 20)).toBe(2);
    expect(contactPageAfterLoad(1, 10, 0)).toBe(1);
    expect(buildContactsQuery({ page: "1", perPage: "10" })).not.toHaveProperty("hasCustomer");
  });
});
