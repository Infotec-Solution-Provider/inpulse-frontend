import type { CreateSegmentRequest, Segment, UpdateSegmentRequest } from "@/lib/sdk-local";

export interface SegmentDraft {
  name: string;
  order: string;
  unit?: string;
}

export function segmentDraft(segment?: Segment): SegmentDraft {
  return {
    name: segment?.NOME ?? "",
    order: segment?.ordem?.toString() ?? "",
    unit: segment?.COD_UNIDADE?.toString() ?? "",
  };
}

export function segmentDraftValidation(draft: SegmentDraft, original?: Segment) {
  const name = draft.name.trim();
  const nameChanged = !original || (draft.name !== (original.NOME ?? "") && name !== original.NOME);
  const nameError =
    nameChanged &&
    (!name ||
      Array.from(name).length > 50 ||
      Array.from(name).some(
        (char) =>
          char.charCodeAt(0) > 0xff || (char.charCodeAt(0) >= 0x80 && char.charCodeAt(0) < 0xa0),
      ))
      ? "Informe um nome com até 50 caracteres compatíveis com o CRM."
      : "";
  const orderError = "";
  const order = original?.ordem ?? null;
  const unitText =
    draft.unit === undefined ? (original?.COD_UNIDADE?.toString() ?? "") : draft.unit.trim();
  const unit = unitText === "" ? null : Number(unitText);
  const unitChanged = !original || unit !== original.COD_UNIDADE;
  const unitError =
    unitChanged &&
    unitText !== "" &&
    (!/^[1-9]\d*$/.test(unitText) || !Number.isSafeInteger(unit) || unit! > 2147483647)
      ? "Selecione uma unidade cadastrada."
      : "";
  const hasChanges = !original || nameChanged || unitChanged;
  return {
    name,
    order,
    unit,
    unitChanged,
    nameChanged,
    nameError,
    orderError,
    unitError,
    hasChanges,
  };
}

export function createSegmentPayload(draft: SegmentDraft): CreateSegmentRequest {
  const { name, unit } = segmentDraftValidation(draft);
  return {
    NOME: name,
    ...(draft.unit?.trim() ? { COD_UNIDADE: unit } : {}),
  };
}

export function updateSegmentPayload(draft: SegmentDraft, original: Segment): UpdateSegmentRequest {
  const { name, unit, unitChanged, nameChanged } = segmentDraftValidation(draft, original);
  return {
    changes: {
      ...(nameChanged ? { NOME: name } : {}),
      ...(unitChanged ? { COD_UNIDADE: unit } : {}),
    },
    expected: { NOME: original.NOME, ordem: original.ordem, COD_UNIDADE: original.COD_UNIDADE },
  };
}
