import type { ContactsFilters } from "./(table)/contacts-reducer";

export function buildContactsQuery(filters: ContactsFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: Number(filters.page || 1),
    perPage: Number(filters.perPage || 10),
  };
  if (filters.sectorIds?.length) params.sectorIds = filters.sectorIds.join(",");
  if (filters.hasCustomer === "true" || filters.hasCustomer === "false")
    params.hasCustomer = filters.hasCustomer === "true";
  const search = filters.searchTerm?.trim();
  if (search) {
    const field = filters.searchField;
    if (field === "nome") params.name = search;
    if (field === "telefone") params.phone = search.replace(/\D/g, "");
    if (field === "codigo" && /^\d+$/.test(search)) params.customerId = Number(search);
    if (field === "codigo-erp") params.customerErp = search;
    if (field === "cpf-cnpj") params.customerCnpj = search.replace(/\D/g, "");
    if (field === "razao-social") params.customerName = search;
  } else {
    if (filters.id) params.id = Number(filters.id);
    if (filters.name) params.name = filters.name;
    if (filters.phone) params.phone = filters.phone.replace(/\D/g, "");
    if (filters.customerName) params.customerName = filters.customerName;
    if (filters.customerId) params.customerId = Number(filters.customerId);
  }
  return params;
}

export function contactPageAfterLoad(page: number, perPage: number, total: number): number {
  return Math.min(page, Math.max(1, Math.ceil(total / perPage)));
}
