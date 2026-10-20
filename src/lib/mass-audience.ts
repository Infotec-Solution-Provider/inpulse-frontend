import type { WppContactWithCustomer } from "@/lib/sdk-local";

export type AudienceContact = Omit<WppContactWithCustomer, "phone"> & { phone: string | null };

export interface AudienceContactFilters {
  id?: number;
  ids?: number[];
  name?: string;
  phone?: string;
  hasCustomer?: boolean;
  sectorIds?: number[];
}

export interface AudienceFilters {
  contactFilters: AudienceContactFilters;
  customerFilters: Record<string, string>;
}

export interface AudienceSummary {
  total: number;
  eligible: number;
  blocked: number;
  skipped: number;
}

export interface AudienceSelection {
  mode: "MANUAL" | "ALL_FILTERED";
  included: Record<number, boolean>;
  excluded: Record<number, boolean>;
  excludedMatches: Record<number, boolean>;
}

export interface AudienceDefinitionV2 {
  filtersJson: AudienceFilters & { version: 2; selectionMode: AudienceSelection["mode"] };
  manualIncludeJson: { contactIds: number[] };
  manualExcludeJson: { contactIds: number[] };
}

export interface MassAudienceValue {
  definition: AudienceDefinitionV2;
  selected: number;
  eligible: number;
  canCreate: boolean;
}

export const emptyAudienceFilters = (): AudienceFilters => ({
  contactFilters: {},
  customerFilters: {},
});
export const emptyAudienceSelection = (): AudienceSelection => ({
  mode: "MANUAL",
  included: {},
  excluded: {},
  excludedMatches: {},
});

export function normalizeAudienceFilters(filters: AudienceFilters): AudienceFilters {
  const clean = (values: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(values)
        .filter(
          ([, value]) =>
            value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0),
        )
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  return {
    contactFilters: clean(filters.contactFilters as Record<string, unknown>),
    customerFilters: clean(filters.customerFilters) as Record<string, string>,
  };
}

export function contactIsEligible(contact: Pick<AudienceContact, "phone" | "isBlocked">): boolean {
  return !contact.isBlocked && Boolean((contact.phone ?? "").replace(/\D/g, ""));
}

export function audienceContactSelected(selection: AudienceSelection, id: number): boolean {
  return selection.mode === "ALL_FILTERED" ? !(id in selection.excluded) : id in selection.included;
}

export function toggleAudienceContact(
  selection: AudienceSelection,
  id: number,
  eligible: boolean,
): AudienceSelection {
  if (!eligible && selection.mode === "MANUAL" && !(id in selection.included)) return selection;
  const key = selection.mode === "ALL_FILTERED" ? "excluded" : "included";
  const entries = { ...selection[key] };
  if (id in entries) delete entries[id];
  else entries[id] = eligible;
  const excludedMatches = { ...selection.excludedMatches };
  if (key === "excluded") {
    if (id in entries) excludedMatches[id] = true;
    else delete excludedMatches[id];
  }
  return { ...selection, [key]: entries, excludedMatches };
}

export function selectAudiencePage(
  selection: AudienceSelection,
  contacts: AudienceContact[],
  checked: boolean,
): AudienceSelection {
  const included = { ...selection.included },
    excluded = { ...selection.excluded },
    excludedMatches = { ...selection.excludedMatches };
  for (const contact of contacts) {
    if (!contactIsEligible(contact)) continue;
    if (selection.mode === "MANUAL") {
      if (checked) included[contact.id] = true;
      else delete included[contact.id];
    } else {
      if (checked) {
        delete excluded[contact.id];
        delete excludedMatches[contact.id];
      } else {
        excluded[contact.id] = true;
        excludedMatches[contact.id] = true;
      }
    }
  }
  return { ...selection, included, excluded, excludedMatches };
}

/** Refresh known eligibility without dropping selections on other pages. */
export function reconcileAudiencePage(
  selection: AudienceSelection,
  contacts: AudienceContact[],
): AudienceSelection {
  const included = { ...selection.included },
    excluded = { ...selection.excluded };
  for (const contact of contacts) {
    if (contact.id in included) included[contact.id] = contactIsEligible(contact);
    if (contact.id in excluded) excluded[contact.id] = contactIsEligible(contact);
  }
  return { ...selection, included, excluded };
}

/** A bounded ID search also distinguishes absent exclusions from matching ineligible rows. */
export function reconcileAudienceIds(
  selection: AudienceSelection,
  ids: number[],
  contacts: AudienceContact[],
): AudienceSelection {
  const result = {
    ...selection,
    included: { ...selection.included },
    excluded: { ...selection.excluded },
    excludedMatches: { ...selection.excludedMatches },
  };
  const found = new Map(contacts.map((contact) => [contact.id, contact]));
  for (const id of ids) {
    const contact = found.get(id);
    if (id in result.included) result.included[id] = Boolean(contact && contactIsEligible(contact));
    if (id in result.excluded) {
      result.excluded[id] = Boolean(contact && contactIsEligible(contact));
      result.excludedMatches[id] = Boolean(contact);
    }
  }
  return result;
}

export function audienceSelectionCounts(selection: AudienceSelection, summary: AudienceSummary) {
  return selection.mode === "MANUAL"
    ? {
        selected: Object.keys(selection.included).length,
        eligible: Object.values(selection.included).filter(Boolean).length,
      }
    : {
        selected: Math.max(
          0,
          summary.total -
            Object.keys(selection.excluded).filter(
              (id) => selection.excludedMatches[Number(id)] !== false,
            ).length,
        ),
        eligible: Math.max(
          0,
          summary.eligible -
            Object.entries(selection.excluded).filter(
              ([id, eligible]) => eligible && selection.excludedMatches[Number(id)] !== false,
            ).length,
        ),
      };
}

export function buildAudienceDefinition(
  filters: AudienceFilters,
  selection: AudienceSelection,
): AudienceDefinitionV2 {
  return {
    filtersJson: {
      version: 2,
      selectionMode: selection.mode,
      ...normalizeAudienceFilters(filters),
    },
    manualIncludeJson: {
      contactIds: selection.mode === "MANUAL" ? Object.keys(selection.included).map(Number) : [],
    },
    manualExcludeJson: {
      contactIds:
        selection.mode === "ALL_FILTERED" ? Object.keys(selection.excluded).map(Number) : [],
    },
  };
}

export const emptyMassAudienceValue = (): MassAudienceValue => ({
  definition: buildAudienceDefinition(emptyAudienceFilters(), emptyAudienceSelection()),
  selected: 0,
  eligible: 0,
  canCreate: false,
});

export function validateAudienceFilters(filters: AudienceFilters): string | null {
  if (
    filters.contactFilters.id !== undefined &&
    (!Number.isSafeInteger(filters.contactFilters.id) || filters.contactFilters.id <= 0)
  )
    return "Informe um código de contato inteiro e maior que zero.";
  for (const [from, to] of [
    ["purchaseFrom", "purchaseTo"],
    ["registeredFrom", "registeredTo"],
  ]) {
    if (
      filters.customerFilters[from] &&
      filters.customerFilters[to] &&
      filters.customerFilters[from] > filters.customerFilters[to]
    )
      return "A data inicial deve ser anterior ou igual à data final.";
  }
  if (filters.customerFilters.phone && filters.customerFilters.phone.replace(/\D/g, "").length < 3)
    return "O telefone do cliente deve conter pelo menos três dígitos.";
  return null;
}
