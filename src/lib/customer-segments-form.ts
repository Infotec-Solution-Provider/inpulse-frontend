import type { CreateSegmentRequest, Segment, UpdateSegmentRequest } from "@/lib/sdk-local";

export interface SegmentDraft {
  name: string;
  order: string;
}

export function segmentDraft(segment?: Segment): SegmentDraft {
  return { name: segment?.NOME ?? "", order: segment?.ordem?.toString() ?? "" };
}

export function segmentDraftValidation(draft: SegmentDraft, original?: Segment) {
  const name = draft.name.trim();
  const nameChanged = !original || (draft.name !== (original.NOME ?? "") && name !== original.NOME);
  const nameError =
    nameChanged && (!name || Array.from(name).length > 50 || Array.from(name).some(char => char.charCodeAt(0) > 0xff || (char.charCodeAt(0) >= 0x80 && char.charCodeAt(0) < 0xa0)))
      ? "Informe um nome com até 50 caracteres compatíveis com o CRM."
      : "";
  const orderValue = draft.order.trim();
  const orderError =
    orderValue !== "" &&
    (!/^-?\d+$/.test(orderValue) ||
      !Number.isSafeInteger(Number(orderValue)) ||
      Number(orderValue) < -2147483648 ||
      Number(orderValue) > 2147483647)
      ? "Informe um número inteiro entre -2147483648 e 2147483647."
      : "";
  const order = orderValue === "" ? null : Number(orderValue);
  const hasChanges = !original || nameChanged || order !== original.ordem;
  return { name, order, nameChanged, nameError, orderError, hasChanges };
}

export function createSegmentPayload(draft: SegmentDraft): CreateSegmentRequest {
  const { name, order } = segmentDraftValidation(draft);
  return { NOME: name, ...(draft.order.trim() !== "" ? { ordem: order } : {}) };
}

export function updateSegmentPayload(draft: SegmentDraft, original: Segment): UpdateSegmentRequest {
  const { name, order, nameChanged } = segmentDraftValidation(draft, original);
  return {
    changes: {
      ...(nameChanged ? { NOME: name } : {}),
      ...(order !== original.ordem ? { ordem: order } : {}),
    },
    expected: { NOME: original.NOME, ordem: original.ordem, COD_UNIDADE: original.COD_UNIDADE },
  };
}
